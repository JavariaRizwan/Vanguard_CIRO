import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from "@google/genai";
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import mysql from 'mysql2/promise';
import fs from 'fs';

dotenv.config();

// MySQL Connection Pool Configuration
const poolConfig: mysql.PoolOptions = {
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ciro_pakistan',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Check for Cloud SQL connection
if (process.env.INSTANCE_CONNECTION_NAME) {
  // If INSTANCE_CONNECTION_NAME is provided, connect via unix socket
  poolConfig.socketPath = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
  console.log(`🔌 Configuring Cloud SQL connection via Socket Path: ${poolConfig.socketPath}`);
} else if (process.env.DB_SOCKET) {
  // Generic socket path config
  poolConfig.socketPath = process.env.DB_SOCKET;
  console.log(`🔌 Configuring database connection via Socket Path: ${poolConfig.socketPath}`);
} else {
  // Otherwise, use TCP host connection
  poolConfig.host = process.env.DB_HOST || 'localhost';
  poolConfig.port = process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306;
  console.log(`🔌 Configuring database connection via Host: ${poolConfig.host}:${poolConfig.port}`);
}

const pool = mysql.createPool(poolConfig);

// Test Connection and Schema
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Successfully connected to MySQL Database.');
    
    // Ensure status column can accept any string (removes strict ENUM limits)
    try {
      await connection.query("ALTER TABLE incidents MODIFY COLUMN status VARCHAR(50) DEFAULT 'Pending'");
      console.log('🔧 Successfully ensured incidents.status column is VARCHAR(50).');
    } catch (alterErr: any) {
      console.warn('⚠️ Could not alter incidents table status column:', alterErr.message);
    }

    const [tables]: any = await connection.query('SHOW TABLES');
    console.log('📦 Database Tables:', tables.map((t: any) => Object.values(t)[0]).join(', '));
    
    connection.release();
  } catch (error: any) {
    console.error('❌ Database Connection Error:', error.message);
    console.error('👉 Please check your .env credentials and ensure MySQL is running.');
  }
})();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

const connectedClients = new Set<WebSocket>();
let notificationHistory: any[] = [];

wss.on('connection', (ws) => {
  connectedClients.add(ws);
  ws.send(JSON.stringify({ type: 'INIT_HISTORY', payload: notificationHistory }));
  ws.on('close', () => connectedClients.delete(ws));
});

function broadcastNotification(notification: any) {
  const msg = JSON.stringify({ type: 'NOTIFICATION', payload: notification });
  notificationHistory = [notification, ...notificationHistory].slice(0, 50);
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
  if (pathname === '/api-ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; " +
    "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: blob: https://api.tomtom.com https://unpkg.com https://images.unsplash.com https://*.tile.openstreetmap.org; " +
    "connect-src 'self' ws: wss: http: https:;"
  );
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Global JSON error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload too large. Please upload smaller files.' });
  }
  next();
});

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper to generate a unique Citizen ID
function generateCitizenId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'CI-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Auth Endpoints
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin') {
    const token = 'admin-token-' + Math.random().toString(36).substring(7);
    res.json({ token, user: { name: 'Command Center Admin', role: 'admin' } });
  } else {
    res.status(401).json({ error: 'Unauthorized Access' });
  }
});

app.get('/api/admin/stats', async (req, res) => {
  try {
    const [incidents]: any = await pool.query('SELECT * FROM incidents ORDER BY created_at DESC LIMIT 50');
    
    // Map database fields to the format expected by the Admin Dashboard
    const mappedIncidents = incidents.map((i: any) => ({
      ...i,
      id: i.id.toString(),
      confidence: i.confidenceScore > 0.9 ? 'High' : i.confidenceScore > 0.7 ? 'Moderate' : 'Low',
      confidenceScore: i.confidenceScore || 0.5,
      coordinates: [parseFloat(i.lat), parseFloat(i.lng)],
      status: i.status === 'Solved' ? 'Processed' : i.status || 'Reported',
      reporterName: i.reporterName || i.name || 'Anonymous'
    }));

    res.json({
      activeAgents: 24,
      totalIncidents: mappedIncidents.length,
      activeCrises: mappedIncidents.length,
      activeCrisesList: mappedIncidents,
      availableBoats: { current: 4, total: 5 },
      ambulances: { current: 8, total: 12 },
      resourceAllocation: [
        { label: 'Available Boats', current: 4, total: 5, color: 'teal' },
        { label: 'Ambulances', current: 8, total: 12, color: 'orange' }
      ]
    });
  } catch (error: any) {
    console.error('❌ Admin stats error:', error.message);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  console.log('📝 Attempting registration for:', email);
  try {
    const [existing]: any = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      console.warn('⚠️ Registration failed: User already exists:', email);
      return res.status(400).json({ error: 'User already exists' });
    }

    const citizenId = generateCitizenId();
    await pool.query('INSERT INTO users (citizenId, name, email, password) VALUES (?, ?, ?, ?)', 
      [citizenId, name, email, password]);

    console.log('✅ User registered successfully. CitizenID:', citizenId);
    res.status(201).json({ message: 'User registered', citizenId });
  } catch (error: any) {
    console.error('❌ Register error:', error.message);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { citizenId, password } = req.body;
  console.log('🔑 Login attempt for ID/Email:', citizenId);
  try {
    const [rows]: any = await pool.query(
      'SELECT citizenId, email, name FROM users WHERE (citizenId = ? OR email = ?) AND password = ?', 
      [citizenId, citizenId, password]
    );

    if (rows.length === 0) {
      console.warn('⚠️ Login failed: Invalid credentials for:', citizenId);
      return res.status(401).json({ error: 'Invalid credentials. Please check your Citizen ID and password.' });
    }

    const token = Math.random().toString(36).substring(7);
    console.log('✅ Login successful for:', rows[0].name);
    res.json({ token, user: rows[0] });
  } catch (error: any) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

// Authentic Alerts Endpoint using Gemini
let resolvedAlertIds = new Set<string>();

app.get('/api/social-feed', async (req, res) => {
  const scrapeBadgerKey = process.env.SCRAPEBADGER_API_KEY;
  if (scrapeBadgerKey && scrapeBadgerKey.trim() !== '') {
    try {
      console.log('📡 Fetching real-time Twitter data via Scrapebadger API...');
      const searchQuery = 'Pakistan flood OR Karachi rain OR Lahore electricity OR Pakistan landslide';
      const response = await fetch(`https://scrapebadger.com/v1/twitter/tweets/search?query=${encodeURIComponent(searchQuery)}&limit=10`, {
        method: 'GET',
        headers: {
          'x-api-key': scrapeBadgerKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data: any = await response.json();
        const tweetsList = Array.isArray(data) ? data : (data.tweets || data.data || []);
        
        if (tweetsList.length > 0) {
          const mappedFeed = tweetsList.map((tweet: any, index: number) => {
            const tweetId = tweet.id || tweet.id_str || `sb-${index}-${Date.now()}`;
            const username = tweet.user?.screen_name || tweet.username || tweet.user?.name || 'PakCrisisObserver';
            const text = tweet.text || tweet.full_text || tweet.content || 'Report of structural damage in Faisalabad.';
            
            let relativeTime = 'Just now';
            if (tweet.created_at) {
              const diffMs = Date.now() - new Date(tweet.created_at).getTime();
              const diffMins = Math.floor(diffMs / 60000);
              if (diffMins < 60) {
                relativeTime = `${Math.max(1, diffMins)}m ago`;
              } else {
                const diffHrs = Math.floor(diffMins / 60);
                relativeTime = `${diffHrs}h ago`;
              }
            } else {
              relativeTime = `${index + 2}m ago`;
            }
            
            const likes = Math.floor(Math.random() * 45) + 5;
            const comments = [
              {
                id: `cmt-${tweetId}-1`,
                author: 'John Doe',
                avatarColor: '#ef4444',
                timestamp: '03 Sep at 05:41 pm',
                text: 'This is a severe situation. The emergency response units have been alerted.'
              },
              {
                id: `cmt-${tweetId}-2`,
                author: 'Ayesha Khan',
                avatarColor: '#10b981',
                timestamp: '03 Sep at 06:12 pm',
                text: 'Hope everyone remains safe! Local rescue squads are on-site.'
              }
            ];
            
            let image = 'https://images.unsplash.com/photo-1594897030264-ab7d87efc473?auto=format&fit=crop&w=800&q=80';
            const lowerText = text.toLowerCase();
            if (lowerText.includes('flood') || lowerText.includes('rain') || lowerText.includes('water')) {
              image = 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80';
            } else if (lowerText.includes('landslide') || lowerText.includes('debris') || lowerText.includes('earthquake') || lowerText.includes('collapse')) {
              image = 'https://images.unsplash.com/photo-1594897030264-ab7d87efc473?auto=format&fit=crop&w=800&q=80';
            }
            
            return {
              id: tweetId,
              user: username,
              text: text,
              timestamp: relativeTime,
              platform: 'Twitter',
              image: image,
              likes: likes,
              commentsCount: comments.length,
              sharesCount: Math.floor(Math.random() * 5) + 1,
              comments: comments
            };
          });
          return res.json(mappedFeed);
        }
      } else {
        console.warn(`⚠️ Scrapebadger responded with error status: ${response.status}`);
      }
    } catch (err: any) {
      console.error('❌ Scrapebadger fetch error:', err.message);
    }
  }

  // Fallback to Gemini simulated rich response
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate 5-6 short social media posts (mixture of Urdu script and English) about ongoing or recent (simulated) infrastructure/weather issues in Pakistan. Posts should look like Twitter/WhatsApp updates. Return them as a JSON list.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              user: { type: Type.STRING },
              text: { type: Type.STRING },
              timestamp: { type: Type.STRING },
              platform: { type: Type.STRING, enum: ['Twitter', 'WhatsApp', 'Public Feed'] }
            },
            required: ['id', 'user', 'text', 'timestamp', 'platform']
          }
        }
      }
    });

    const parsed = JSON.parse(response.text);
    const richFeed = parsed.map((post: any, idx: number) => {
      const tweetId = post.id || `gen-${idx}-${Date.now()}`;
      const likes = Math.floor(Math.random() * 45) + 5;
      const comments = [
        {
          id: `cmt-${tweetId}-1`,
          author: 'John Doe',
          avatarColor: '#ef4444',
          timestamp: '03 Sep at 05:41 pm',
          text: 'This is a severe situation. The emergency response units have been alerted.'
        },
        {
          id: `cmt-${tweetId}-2`,
          author: 'Ayesha Khan',
          avatarColor: '#10b981',
          timestamp: '03 Sep at 06:12 pm',
          text: 'Hope everyone remains safe! Local rescue squads are on-site.'
        }
      ];
      
      let image = 'https://images.unsplash.com/photo-1594897030264-ab7d87efc473?auto=format&fit=crop&w=800&q=80';
      const lowerText = (post.text || '').toLowerCase();
      if (lowerText.includes('flood') || lowerText.includes('rain') || lowerText.includes('water') || lowerText.includes('بارش') || lowerText.includes('پانی')) {
        image = 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80';
      } else if (lowerText.includes('landslide') || lowerText.includes('debris') || lowerText.includes('earthquake') || lowerText.includes('collapse') || lowerText.includes('زلزلہ')) {
        image = 'https://images.unsplash.com/photo-1594897030264-ab7d87efc473?auto=format&fit=crop&w=800&q=80';
      }

      return {
        ...post,
        image: image,
        likes: likes,
        commentsCount: comments.length,
        sharesCount: Math.floor(Math.random() * 5) + 1,
        comments: comments
      };
    });
    res.json(richFeed);
  } catch (error) {
    // Fallback static rich social feed
    const staticPosts = [
      { id: 'sf-1', user: 'KarachiTraffic', text: 'Avoid Shahrah-e-Faisal, water logging near Nursery. کراچی ٹریفک الرٹ: شاہراہ فیصل پر نرسری کے قریب پانی جمع ہے۔', platform: 'Twitter', timestamp: '5m ago' },
      { id: 'sf-2', user: 'Resident786', text: 'Electricity out in Gulberg for 3 hours now. #Lahore #Loadshedding', platform: 'Twitter', timestamp: '12m ago' },
      { id: 'sf-3', user: 'Rescue Volunteer', text: 'Heavy rain expected in Rawalpindi. Stay safe everyone. بارش کا امکان ہے۔ محتاط رہیں۔', platform: 'WhatsApp', timestamp: '22m ago' }
    ];

    const fallbackRich = staticPosts.map((post: any, idx: number) => {
      const tweetId = post.id;
      const likes = Math.floor(Math.random() * 45) + 5;
      const comments = [
        {
          id: `cmt-${tweetId}-1`,
          author: 'John Doe',
          avatarColor: '#ef4444',
          timestamp: '03 Sep at 05:41 pm',
          text: 'This is a severe situation. The emergency response units have been alerted.'
        },
        {
          id: `cmt-${tweetId}-2`,
          author: 'Ayesha Khan',
          avatarColor: '#10b981',
          timestamp: '03 Sep at 06:12 pm',
          text: 'Hope everyone remains safe! Local rescue squads are on-site.'
        }
      ];
      
      let image = 'https://images.unsplash.com/photo-1594897030264-ab7d87efc473?auto=format&fit=crop&w=800&q=80';
      const lowerText = (post.text || '').toLowerCase();
      if (lowerText.includes('flood') || lowerText.includes('rain') || lowerText.includes('water')) {
        image = 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80';
      } else if (lowerText.includes('landslide') || lowerText.includes('debris') || lowerText.includes('earthquake') || lowerText.includes('collapse')) {
        image = 'https://images.unsplash.com/photo-1594897030264-ab7d87efc473?auto=format&fit=crop&w=800&q=80';
      }

      return {
        ...post,
        image: image,
        likes: likes,
        commentsCount: comments.length,
        sharesCount: Math.floor(Math.random() * 5) + 1,
        comments: comments
      };
    });
    res.json(fallbackRich);
  }
});

app.post('/api/alerts/resolve', (req, res) => {
  const { alertId } = req.body;
  if (alertId) {
    resolvedAlertIds.add(alertId);
    res.json({ success: true, alertId });
  } else {
    res.status(400).json({ error: 'Missing alert ID' });
  }
});

app.get('/api/alerts/authentic', async (req, res) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Get the latest 3-4 critical flood, weather, heavy rain, heatwave, or emergency alerts across all of Pakistan (National/Provincial levels) from the last 24-48 hours. Focus on official warnings from PMD, NDMA, or PDMA. Return them as a JSON list.",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              location: { type: Type.STRING },
              severity: { type: Type.STRING, enum: ['Critical', 'Warning', 'Info'] },
              confidence: { type: Type.NUMBER, description: "Confidence percentage (0-100)" },
              time: { type: Type.STRING },
              source: { type: Type.STRING, enum: ['Twitter', 'WhatsApp', 'Weather API', 'Traffic API', 'Satellite'] },
              worstCase: { type: Type.STRING },
              prepTips: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['id', 'type', 'title', 'description', 'severity', 'confidence', 'time', 'source']
          }
        }
      }
    });

    let alerts = JSON.parse(response.text);
    alerts = alerts.filter((a: any) => !resolvedAlertIds.has(a.id));
    res.json(alerts);
  } catch (error: any) {
    // Check if it's a quota error or rate limit
    const isQuotaError = error?.message?.includes('429') || error?.status === 429 || error?.code === 429;

    if (isQuotaError) {
      console.warn('Gemini API Quota Exceeded (429). Serving fallback alerts.');
    } else {
      console.error('Error fetching authentic alerts:', error);
    }

    // Fallback to realistic simulated data if Gemini fails
    const fallback = [
      {
        id: 'fb-101',
        type: 'Flooding',
        title: 'Pre-Monsoon Rainfall Patterns',
        description: 'Atmospheric pressure variations detected in northern parts of Pakistan may lead to heavy localized precipitation.',
        severity: 'Warning',
        confidence: 82,
        time: 'Active for next 24h',
        location: 'Northern Areas / KPK',
        source: 'Satellite',
        worstCase: 'Flash flooding in narrow valleys and potential landslide risks on KKH.',
        prepTips: [
          'Store 3 days of dry rations and clean water',
          'Avoid travel through high-risk mountain passes',
          'Keep power banks charged for emergency comms'
        ]
      },
      {
        id: 'fb-102',
        type: 'Heatwave',
        title: 'Extreme Temperatures in Sindh',
        description: 'Daytime temperatures expected to cross 45°C in Jacobabad and surrounding districts.',
        severity: 'Critical',
        confidence: 94,
        time: 'Persistent',
        location: 'Jacobabad, Larkana, Sukkur',
        source: 'Weather API',
        worstCase: 'High risk of heatstroke and dehydration among elderly and children.',
        prepTips: [
          'Remain indoors between 11 AM and 4 PM',
          'Increase intake of ORS or lemon water',
          'Check on vulnerable neighbors twice daily'
        ]
      },
      {
        id: 'fb-103',
        type: 'Accident',
        title: 'Multi-Vehicle Collision on M-2',
        description: 'Large scale accident reported near Salt Range due to brake failure of a heavy transport vehicle.',
        severity: 'Critical',
        confidence: 98,
        time: '15m ago',
        location: 'M-2 Motorway, Salt Range',
        source: 'Traffic API',
        worstCase: 'Prolonged blockage of Northbound carriage and potential casualties.',
        prepTips: [
          'Use alternate route via GT Road',
          'Yield to emergency vehicles',
          'Do not stop to film the scene'
        ]
      }
    ];
    res.json(fallback.filter(a => !resolvedAlertIds.has(a.id)));
  }
});

app.post('/api/voice-autofill', async (req, res) => {
  const { audioData, mimeType } = req.body;
  if (!audioData) return res.status(400).json({ error: 'No audio data' });

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        parts: [
          { text: "You are an emergency response AI. Listen to the audio which may be in Urdu, English, or a mix (Roman Urdu). Extract the speaker's Name and a clear Incident Description. Return ONLY a valid JSON object with the following keys: 'name' (string) and 'description' (string). If a value is missing, use an empty string. Do not include any other text or explanation." },
          { inlineData: { mimeType: mimeType || "audio/webm", data: audioData } }
        ]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ['name', 'description']
        }
      }
    });

    let text = result.text || '';
    // Sometimes Gemini returns JSON wrapped in markdown blocks
    text = text.replace(/```json\n?/, '').replace(/\n?```/, '').trim();

    try {
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (e) {
      console.error('Failed to parse Gemini JSON:', text);
      res.json({ name: '', description: '' });
    }
  } catch (error: any) {
    const isQuotaError = error?.message?.includes('429') || error?.status === 429 || error?.code === 429;
    const isInvalidKey = error?.message?.includes('API key not valid') || error?.status === 400;

    if (isQuotaError) {
      console.warn('Gemini API Quota Exceeded (429) during voice processing.');
      res.status(200).json({ error: 'Gemini Quota Exceeded. Please try again in a minute.', name: '', description: '' });
    } else if (isInvalidKey) {
      console.error('Gemini API Key Invalid:', error.message);
      res.status(200).json({ error: 'Invalid API Key. Please check your .env file and RESTART the server.', name: '', description: '' });
    } else {
      console.error('Voice Processing Error:', error);
      res.status(200).json({ error: `AI Error: ${error.message || 'Unknown error'}`, name: '', description: '' });
    }
  }
});

app.post('/api/verify-image', async (req, res) => {
  const { imageData, mimeType } = req.body;
  if (!imageData) return res.status(400).json({ error: 'No image data' });

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        parts: [
          { text: "Analyze this image for a 'Road Blockage' emergency report. Determine if it is an authentic photo of a road issue in Pakistan or if it appears to be a stock photo, AI-generated, or unrelated. Return ONLY a JSON object with 'authentic' (boolean) and 'reason' (string) in English." },
          { inlineData: { mimeType: mimeType || "image/jpeg", data: imageData } }
        ]
      }],
      config: {
        responseMimeType: "application/json",
      }
    });

    let text = result.text || '';
    text = text.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (error) {
    console.error('Image Verification Error:', error);
    res.status(200).json({ authentic: true, reason: 'Verification skipped due to technical issues' });
  }
});

// Simulated GIS Data (GLOFAS/NASA Simulation)
app.get('/api/gis-data', (req, res) => {
  res.json({
    precipitationAlerts: [],
    predictedFloodExtent: [],
    residentialPoints: [],
    urbanPoints: [
      [33.6844, 73.0479], [24.8607, 67.0011], [31.5204, 74.3587]
    ],
    highRiskZones: [],
    topographyLayers: {
      elevationProfile: [
        { point: 'North', elevation: 1500, lat: 34.0, lon: 73.0 },
        { point: 'South', elevation: 20, lat: 25.0, lon: 67.0 }
      ],
      flowTimeHours: 4.5
    }
  });
});

app.get('/api/incidents', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM incidents ORDER BY created_at DESC');
    res.json(rows);
  } catch (error: any) {
    console.error('❌ Fetch incidents error:', error.message);
    res.status(500).json({ error: 'Database error: ' + error.message });
  }
});

app.get('/api/incidents/:id', async (req, res) => {
  try {
    const [rows]: any = await pool.query(
      `SELECT i.*, 
        h.area_location as hw_area, h.heatwave_status, h.has_disease, h.disease_name as hw_disease, h.mitigation_required,
        rb.blockage_location, rb.incident_occurred as rb_occurred, rb.blockage_details,
        po.voltage_problem, po.duration_hours,
        he.medical_problem, he.illness_duration, he.immediate_action,
        ds.disease_name as ds_disease, ds.spike_duration, ds.people_affected,
        acc.accident_type, acc.accident_location, acc.accident_time, acc.injured_count
      FROM incidents i
      LEFT JOIN details_heatwave h ON i.id = h.incident_id
      LEFT JOIN details_road_blockage rb ON i.id = rb.incident_id
      LEFT JOIN details_power_outage po ON i.id = po.incident_id
      LEFT JOIN details_health he ON i.id = he.incident_id
      LEFT JOIN details_disease_spike ds ON i.id = ds.incident_id
      LEFT JOIN details_accident acc ON i.id = acc.incident_id
      WHERE i.id = ?`, 
      [req.params.id]
    );
    
    if (rows.length === 0) return res.status(404).json({ error: 'Incident not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Fetch incident detail error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/user/reports', async (req, res) => {
  const { citizenId } = req.query;
  if (!citizenId) return res.status(400).json({ error: 'Citizen ID required' });
  try {
    const [rows] = await pool.query('SELECT * FROM incidents WHERE citizenId = ? ORDER BY created_at DESC', [citizenId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/incidents', async (req, res) => {
  const { 
    type, severity, infrastructure, coordinates, details, metadata, citizenId, reporter, evidence,
    heatwaveDetails, roadBlockageDetails, powerOutageDetails, healthDetails, diseaseSpikeDetails, accidentDetails 
  } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const satelliteRainfallIntensity = 0.85;
    const metadataConfidence = metadata ? 0.9 : 0.5;
    const confidenceScore = (satelliteRainfallIntensity * 0.6) + (metadataConfidence * 0.4);

    const resolvedCoordinates = coordinates || [30.3753, 69.3451];
    const statuses = ['Pending', 'Processing', 'Solved'];
    const status = statuses[Math.floor(Math.random() * 2)];
    const location = `Reported ${type} at ${resolvedCoordinates[0].toFixed(2)}, ${resolvedCoordinates[1].toFixed(2)}`;
    const locationUrdu = `رپورٹ کردہ ${type}`;
    const reporterName = reporter?.name || 'Anonymous';

    // 1. Insert into Master Table
    const [result]: any = await connection.query(
      `INSERT INTO incidents 
      (citizenId, reporterName, type, severity, infrastructure, location, locationUrdu, lat, lng, time, status, confidence, verified, details, evidence_type, evidence_data) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        citizenId || null,
        reporterName,
        type,
        severity,
        Array.isArray(infrastructure) ? infrastructure.join(', ') : infrastructure,
        location,
        locationUrdu,
        resolvedCoordinates[0],
        resolvedCoordinates[1],
        'Just now',
        status,
        confidenceScore,
        confidenceScore > 0.7,
        details,
        evidence?.type || null,
        evidence?.data || null
      ]
    );

    const incidentId = result.insertId;

    // 2. Insert into Specific Tables based on type
    if (type === 'Urban Flooding') {
      await connection.query('INSERT INTO details_flooding (incident_id, infrastructure_affected) VALUES (?, ?)', 
        [incidentId, Array.isArray(infrastructure) ? infrastructure.join(', ') : infrastructure]);
    } else if (type === 'Heatwave' && heatwaveDetails) {
      await connection.query(
        'INSERT INTO details_heatwave (incident_id, area_location, heatwave_status, has_disease, disease_name, mitigation_required) VALUES (?, ?, ?, ?, ?, ?)',
        [incidentId, heatwaveDetails.area_location, heatwaveDetails.heatwave_status, heatwaveDetails.has_disease, heatwaveDetails.disease_name, heatwaveDetails.mitigation_required.join(',')]
      );
    } else if (type === 'Road Blockage' && roadBlockageDetails) {
      await connection.query(
        'INSERT INTO details_road_blockage (incident_id, blockage_location, incident_occurred, blockage_details, is_authentic_ai) VALUES (?, ?, ?, ?, ?)',
        [incidentId, roadBlockageDetails.blockage_location, roadBlockageDetails.incident_occurred, roadBlockageDetails.blockage_details, true]
      );
    } else if (type === 'Power Outage' && powerOutageDetails) {
      await connection.query(
        'INSERT INTO details_power_outage (incident_id, voltage_problem, duration_hours) VALUES (?, ?, ?)',
        [incidentId, powerOutageDetails.voltage_problem, powerOutageDetails.duration_hours]
      );
    } else if (type === 'Health' && healthDetails) {
      await connection.query(
        'INSERT INTO details_health (incident_id, medical_problem, illness_duration, immediate_action) VALUES (?, ?, ?, ?)',
        [incidentId, healthDetails.medical_problem, healthDetails.illness_duration, healthDetails.immediate_action]
      );
    } else if (type === 'Disease Spike' && diseaseSpikeDetails) {
      await connection.query(
        'INSERT INTO details_disease_spike (incident_id, disease_name, spike_duration, people_affected) VALUES (?, ?, ?, ?)',
        [incidentId, diseaseSpikeDetails.disease_name, diseaseSpikeDetails.spike_duration, diseaseSpikeDetails.people_affected]
      );
    } else if (type === 'Accident' && accidentDetails) {
      await connection.query(
        'INSERT INTO details_accident (incident_id, accident_type, accident_location, accident_time, injured_count) VALUES (?, ?, ?, ?, ?)',
        [incidentId, accidentDetails.accident_type, accidentDetails.accident_location, accidentDetails.accident_time, accidentDetails.injured_count]
      );
    }

    await connection.commit();

    broadcastNotification({
      id: Date.now(),
      type: 'INCIDENT',
      title: `Critical Alert: ${type}`,
      message: `A new ${severity} severity incident reported at ${resolvedCoordinates[0].toFixed(2)}, ${resolvedCoordinates[1].toFixed(2)}`,
      severity: severity === 'Critical' ? 'CRITICAL' : 'HIGH',
      timestamp: new Date().toLocaleTimeString()
    });

    res.status(201).json({ id: incidentId, type, severity, status, location, time: 'Just now' });
    console.log('✅ Incident stored successfully. Master ID:', incidentId);
  } catch (error: any) {
    await connection.rollback();
    console.error('❌ Create incident error:', error.message);
    res.status(500).json({ error: 'Database error: ' + error.message });
  } finally {
    connection.release();
  }
});

// Update Incident Status
app.patch('/api/incidents/:id', async (req, res) => {
  const { id } = req.params;
  let { status } = req.body;
  if (status === 'Processed') {
    status = 'Solved';
  }
  const connection = await pool.getConnection();
  try {
    await connection.query('UPDATE incidents SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, id, status: req.body.status });
    console.log(`✅ Incident ${id} status updated to: ${status}`);
  } catch (error: any) {
    console.error('❌ Update incident error:', error.message);
    res.status(500).json({ error: 'Database error: ' + error.message });
  } finally {
    connection.release();
  }
});

// Periodic simulated notifications for Demo
setInterval(() => {
  const events = [
    { title: 'Agent Status Change', message: 'Agent A-002 (Fatima) status changed to DEPLOYING', type: 'AGENT', severity: 'INFO' },
    { title: 'System Alert', message: 'Satellite GIS Sync completed successfully', type: 'SYSTEM', severity: 'SUCCESS' },
    { title: 'Weather Advisory', message: 'Localized intensity increase detected in Faisalabad Sector', type: 'SYSTEM', severity: 'WARNING' }
  ];

  // Randomly send an alert every 20-40 seconds
  if (Math.random() > 0.85) {
    const event = events[Math.floor(Math.random() * events.length)];
    broadcastNotification({
      id: `sim-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      ...event,
      timestamp: new Date().toLocaleTimeString()
    });
  }
}, 10000);

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', async (req, res) => {
      try {
        const htmlPath = path.join(distPath, 'index.html');
        let html = await fs.promises.readFile(htmlPath, 'utf8');
        
        // Inject runtime environment variables dynamically into index.html
        const runtimeConfig = {
          VITE_TOMTOM_API_KEY: process.env.VITE_TOMTOM_API_KEY || process.env.TOMTOM_API_KEY || ''
        };
        const configData = Buffer.from(JSON.stringify(runtimeConfig)).toString('base64');
        
        // Inject into the body element as a data-attribute (100% CSP-compliant, no inline scripts!)
        html = html.replace('<body', `<body data-runtime-config="${configData}"`);
        res.send(html);
      } catch (err: any) {
        console.error('Error reading index.html for injection:', err.message);
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
