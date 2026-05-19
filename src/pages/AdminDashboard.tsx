import { useState, useEffect, useMemo, useRef, ChangeEvent, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Papa from 'papaparse';
import {
  Menu, Bell, Search, Map as MapIcon, Shield, Users,
  BarChart2, Settings, Ship, Activity, Layers,
  ChevronRight, AlertTriangle, Play, ChevronDown, Cross,
  Clock, CheckCircle, Smartphone, User, Filter, MoreVertical, Terminal,
  Upload, Database, AlertOctagon, ShieldAlert, Zap,
  Target, Flame, Headphones, Grid, RefreshCw,
  Briefcase, GraduationCap, UserX, MapPin, Plus, Download
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import MapComponent from '../components/MapComponent';
import AdminMapLibre from '../components/AdminMapLibre';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip as LeafletTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface Crisis {
  id: string;
  type: string;
  location: string;
  severity: string;
  confidence: string;
  confidenceScore: number;
  status: string;
  coordinates?: [number, number];
  reporterName?: string;
}

interface Resource {
  label: string;
  current: number;
  total: number;
  color: string;
}

interface AppNotification {
  id: string;
  type: 'INCIDENT' | 'AGENT' | 'SYSTEM';
  title: string;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'WARNING' | 'INFO' | 'SUCCESS';
  timestamp: string;
  read?: boolean;
}

const TypewriterLog = memo(({ id, text, status, isTyping, isWaiting, isCompleted, onComplete }: { id: string; text: string; status: string; isTyping: boolean; isWaiting: boolean; isCompleted: boolean; onComplete: (id: string) => void }) => {
  const [displayedText, setDisplayedText] = useState('');
  const currentIndex = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (isCompleted) {
      setDisplayedText(text);
      return;
    }

    if (isWaiting) {
      setDisplayedText('');
      return;
    }

    if (isTyping) {
      currentIndex.current = 0;
      setDisplayedText('');

      const timer = setInterval(() => {
        if (currentIndex.current < text.length) {
          setDisplayedText(text.slice(0, currentIndex.current + 1));
          currentIndex.current++;
          const anchor = document.getElementById('scroll-anchor');
          if (anchor) anchor.scrollIntoView({ behavior: 'smooth' });
        } else {
          clearInterval(timer);
          onCompleteRef.current(id);
        }
      }, 35);

      return () => clearInterval(timer);
    }
  }, [id, text, isTyping, isWaiting, isCompleted]);

  if (isWaiting) return null;

  return (
    <>
      {displayedText}
      {status === 'analyzing' && isTyping && currentIndex.current < text.length && (
        <span className="inline-block w-1.5 h-3.5 bg-blue-500 ml-1 animate-pulse"></span>
      )}
    </>
  );
});

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [crises, setCrises] = useState<Crisis[]>([]);
  const [selectedCrisis, setSelectedCrisis] = useState<Crisis | null>(null);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('ciro_admin_active_tab') || 'Dashboard';
  });

  useEffect(() => {
    localStorage.setItem('ciro_admin_active_tab', activeTab);
  }, [activeTab]);

  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  // Personnel Section States
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [personnelStatusFilter, setPersonnelStatusFilter] = useState('All');
  const [showAddPersonnelModal, setShowAddPersonnelModal] = useState(false);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  
  const [newPersonnel, setNewPersonnel] = useState({
    name: '',
    email: '',
    role: 'Rescuer',
    team: 'Rescue Team A',
    status: 'Active',
    location: 'Lahore, Punjab',
    availability: 100,
    avatar: ''
  });

  const [personnelList, setPersonnelList] = useState<any[]>([
    {
      id: 'P-001',
      name: 'Ali Raza',
      email: 'ali.raza@dms.gov',
      role: 'Team Leader',
      team: 'Rescue Team A',
      status: 'On Duty',
      location: 'Lahore, Punjab',
      availability: 100,
      lastActive: '2 min ago',
      lastActiveStatus: 'active',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
      id: 'P-002',
      name: 'Sara Khan',
      email: 'sara.khan@dms.gov',
      role: 'Medical Officer',
      team: 'Medical Team',
      status: 'Active',
      location: 'Islamabad',
      availability: 90,
      lastActive: '5 min ago',
      lastActiveStatus: 'active',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
      id: 'P-003',
      name: 'Usman Ahmed',
      email: 'usman.ahmed@dms.gov',
      role: 'Rescuer',
      team: 'Rescue Team B',
      status: 'On Duty',
      location: 'Faisalabad, Punjab',
      availability: 100,
      lastActive: '1 min ago',
      lastActiveStatus: 'active',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
      id: 'P-004',
      name: 'Ayesha Malik',
      email: 'ayesha.malik@dms.gov',
      role: 'Logistics Officer',
      team: 'Logistics Team',
      status: 'Active',
      location: 'Karachi, Sindh',
      availability: 80,
      lastActive: '10 min ago',
      lastActiveStatus: 'active',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
      id: 'P-005',
      name: 'Bilal Hussain',
      email: 'bilal.hussain@dms.gov',
      role: 'Communication Officer',
      team: 'Comms Team',
      status: 'Off Duty',
      location: 'Multan, Punjab',
      availability: 0,
      lastActive: '2 hours ago',
      lastActiveStatus: 'away',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
      id: 'P-006',
      name: 'Zain Ul Abidin',
      email: 'zain.abidin@dms.gov',
      role: 'Driver',
      team: 'Transport Team',
      status: 'On Duty',
      location: 'Rawalpindi',
      availability: 100,
      lastActive: 'Just now',
      lastActiveStatus: 'active',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&h=150&q=80'
    },
    {
      id: 'P-007',
      name: 'Hina Batool',
      email: 'hina.batool@dms.gov',
      role: 'Data Analyst',
      team: 'IT Team',
      status: 'Active',
      location: 'Lahore, Punjab',
      availability: 70,
      lastActive: '15 min ago',
      lastActiveStatus: 'active',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80'
    }
  ]);

  const handleAddPersonnelSubmit = (e: any) => {
    e.preventDefault();
    if (!newPersonnel.name || !newPersonnel.email) return;
    
    const newMember = {
      id: `P-${String(personnelList.length + 1).padStart(3, '0')}`,
      name: newPersonnel.name,
      email: newPersonnel.email,
      role: newPersonnel.role,
      team: newPersonnel.team,
      status: newPersonnel.status,
      location: newPersonnel.location,
      availability: Number(newPersonnel.availability),
      lastActive: 'Just now',
      lastActiveStatus: 'active' as const,
      avatar: newPersonnel.avatar || ''
    };

    setPersonnelList(prev => [...prev, newMember]);
    setShowAddPersonnelModal(false);
    setNewPersonnel({
      name: '',
      email: '',
      role: 'Rescuer',
      team: 'Rescue Team A',
      status: 'Active',
      location: 'Lahore, Punjab',
      availability: 100,
      avatar: ''
    });
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPersonnel(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportPersonnel = () => {
    // Select relevant fields for the CSV export
    const exportData = filteredPersonnel.map(member => ({
      ID: member.id,
      Name: member.name,
      Email: member.email,
      Role: member.role,
      Team: member.team,
      Status: member.status,
      Location: member.location,
      Availability: `${member.availability}%`,
      'Last Active': member.lastActive
    }));

    // Convert to CSV string using Papa.unparse
    const csv = Papa.unparse(exportData);
    
    // Create blob and download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DMS_Personnel_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const personnelStats = useMemo(() => {
    const total = 248;
    const active = 198;
    const onDuty = 132;
    const training = 26;
    const unavailable = 18;
    
    const addedCount = personnelList.length - 7;
    
    return {
      total: total + addedCount,
      active: active + (addedCount > 0 ? Math.floor(addedCount * 0.8) : 0),
      onDuty: onDuty + (addedCount > 0 ? Math.floor(addedCount * 0.5) : 0),
      training: training + (addedCount > 0 ? Math.floor(addedCount * 0.1) : 0),
      unavailable: unavailable + (addedCount > 0 ? Math.floor(addedCount * 0.1) : 0),
    };
  }, [personnelList]);

  const getRoleBadgeClasses = (role: string) => {
    switch (role) {
      case 'Team Leader':
        return 'bg-blue-50 text-blue-600 border border-blue-100';
      case 'Medical Officer':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
      case 'Rescuer':
        return 'bg-amber-50 text-amber-600 border border-amber-100';
      case 'Logistics Officer':
        return 'bg-purple-50 text-purple-600 border border-purple-100';
      case 'Communication Officer':
        return 'bg-blue-50 text-blue-600 border border-blue-100';
      case 'Driver':
        return 'bg-amber-50 text-amber-600 border border-amber-100';
      case 'Data Analyst':
        return 'bg-pink-50 text-pink-600 border border-pink-100';
      default:
        return 'bg-slate-50 text-slate-600 border border-slate-100';
    }
  };

  const filteredPersonnel = useMemo(() => {
    return personnelList.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(personnelSearch.toLowerCase()) ||
                            member.email.toLowerCase().includes(personnelSearch.toLowerCase()) ||
                            member.role.toLowerCase().includes(personnelSearch.toLowerCase()) ||
                            member.location.toLowerCase().includes(personnelSearch.toLowerCase()) ||
                            member.team.toLowerCase().includes(personnelSearch.toLowerCase());
      
      const matchesStatus = personnelStatusFilter === 'All' || member.status === personnelStatusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [personnelList, personnelSearch, personnelStatusFilter]);

  // Loading States
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingCrises, setIsLoadingCrises] = useState(true);
  const [isLoadingGIS, setIsLoadingGIS] = useState(true);

  const [healthStats, setHealthStats] = useState({
    serverLoad: { value: 24, status: 'green' },
    dbConnections: { value: 42, status: 'green' },
    apiLatency: { value: 120, status: 'green' }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setHealthStats(prev => {
        const load = Math.floor(15 + Math.random() * 40);
        const latency = Math.floor(80 + Math.random() * 150);
        return {
          serverLoad: {
            value: load,
            status: load > 80 ? 'red' : load > 50 ? 'yellow' : 'green'
          },
          dbConnections: {
            value: Math.floor(38 + Math.random() * 12),
            status: 'green'
          },
          apiLatency: {
            value: latency,
            status: latency > 200 ? 'red' : latency > 150 ? 'yellow' : 'green'
          }
        };
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const [layers, setLayers] = useState({
    topography: true,
    grid: true,
    heatmap: true
  });
  const navigate = useNavigate();

  useEffect(() => {
    const admin = localStorage.getItem('ciro_admin');
    if (!admin) {
      navigate('/admin/login');
      return;
    }

    fetchStats();
    const interval = setInterval(fetchStats, 5000);

    // WebSocket Setup
    let ws: WebSocket;
    const connectWS = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/api-ws`);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'INIT_HISTORY') {
            setNotifications(data.payload.map((n: any) => ({ ...n, read: true })));
          } else if (data.type === 'NOTIFICATION') {
            const newNotif = { ...data.payload, read: false };
            setNotifications(prev => [newNotif, ...prev].slice(0, 50));

            if (newNotif.severity === 'CRITICAL' || newNotif.severity === 'HIGH') {
              setActiveToast(newNotif);
              setTimeout(() => setActiveToast(null), 8000);
            }
          }
        } catch (err) {
          console.error('Socket parse err', err);
        }
      };

      ws.onclose = () => {
        console.warn('WebSocket closed. Retrying in 3s...');
        setTimeout(connectWS, 3000);
      };
    };

    connectWS();

    return () => {
      clearInterval(interval);
      if (ws) ws.close();
    };
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      if (!data) return;

      setStats(data);
      setIsLoadingStats(false);

      if (data.activeCrisesList) {
        // Sort by confidence score descending
        const sorted = [...data.activeCrisesList].sort((a, b) => b.confidenceScore - a.confidenceScore);

        // Add "Action Needed" logic
        const enhanced = sorted.map((c: any) => ({
          ...c,
          actionNeeded: c.severity === 'Critical' ? 'Immediate Rescue Dispatch' :
            c.type === 'Heatwave' ? 'Activate Cooling Centers' :
              c.type === 'Power Outage' ? 'Coordinate with Grid Utility' : 'Monitor & Verify'
        }));

        setCrises(enhanced);
        setIsLoadingCrises(false);
        if (!selectedCrisis && enhanced.length > 0) {
          setSelectedCrisis(enhanced[0]);
        }
      }

      // Simulate GIS loading completion
      setTimeout(() => setIsLoadingGIS(false), 2000);
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
      setIsLoadingStats(false);
      setIsLoadingCrises(false);
      setIsLoadingGIS(false);
    }
  };

  const navLinks = [
    { name: 'Dashboard', icon: <Grid className="w-4 h-4" /> },
    { name: 'Operations', icon: <Headphones className="w-4 h-4" /> },
    { name: 'Reports', icon: <Database className="w-4 h-4" /> },
    { name: 'Maps', icon: <MapIcon className="w-4 h-4" /> },
    { name: 'Analytics', icon: <BarChart2 className="w-4 h-4" /> },
    { name: 'Personnel', icon: <User className="w-4 h-4" /> },
    { name: 'Settings', icon: <Settings className="w-4 h-4" /> }
  ];

  // Mock data for Charts
  const analyticsData = {
    line: [
      { name: '08:00', reports: 12, risk: 20 },
      { name: '10:00', reports: 34, risk: 35 },
      { name: '12:00', reports: 45, risk: 50 },
      { name: '14:00', reports: 30, risk: 40 },
      { name: '16:00', reports: 56, risk: 70 },
      { name: '18:00', reports: 80, risk: 85 },
      { name: '20:00', reports: 40, risk: 60 }
    ],
    bar: [
      { name: 'Urban Flood', count: 45 },
      { name: 'Medical', count: 28 },
      { name: 'Rescue', count: 62 },
      { name: 'Utility', count: 33 },
      { name: 'Civil', count: 18 }
    ],
    pie: [
      { name: 'Resolved', value: 400, color: '#0D9488' },
      { name: 'In Progress', value: 300, color: '#F59E0B' },
      { name: 'Critical', value: 150, color: '#EF4444' }
    ],
    radar: [
      { subject: 'Response', A: 120, B: 110, fullMark: 150 },
      { subject: 'Resources', A: 98, B: 130, fullMark: 150 },
      { subject: 'Coordination', A: 86, B: 130, fullMark: 150 },
      { subject: 'Safety', A: 99, B: 100, fullMark: 150 },
      { subject: 'Equipment', A: 85, B: 90, fullMark: 150 }
    ]
  };

  const agentsList = [
    { id: 'A-001', name: 'Khalid', role: 'Leader', district: 'Faisalabad SE', status: 'Active' },
    { id: 'A-002', name: 'Fatima', role: 'Medic', district: 'Jhang Rd', status: 'Deploying' },
    { id: 'A-003', name: 'Rurian', role: 'Leader', district: 'Faisalabad SE', status: 'Offline' },
    { id: 'A-004', name: 'Khalid', role: 'Medic', district: 'Jhang Rd', status: 'Offline' },
    { id: 'A-005', name: 'Sarah', role: 'Engineer', district: 'Central Market', status: 'Active' },
    { id: 'A-006', name: 'Ahmed', role: 'Medic', district: 'North Side', status: 'Deploying' }
  ];

  const [incomingQueue, setIncomingQueue] = useState<Crisis[]>([]);
  const [analyzingReports, setAnalyzingReports] = useState<Crisis[]>([]);
  const [processedReports, setProcessedReports] = useState<Crisis[]>([]);

  // Stop Analysis Feature
  const stopAnalysisRef = useRef(false);

  const stopAnalysis = () => {
    stopAnalysisRef.current = true;
    addLog("[SYSTEM] ANALYSIS HALTED BY ADMIN.", "SYSTEM_AGENT", "HALT");
  };

  interface LogEntry {
    id: string;
    agent: string;
    incidentId: string;
    text: string;
    timestamp: string;
    status: 'analyzing' | 'completed';
    modelId: string;
  }

  const [reasoningLogs, setReasoningLogs] = useState<LogEntry[]>([]);
  const [completedTypedIds, setCompletedTypedIds] = useState<Set<string>>(new Set());
  const logCompletionSubscribersRef = useRef<Record<string, () => void>>({});
  const handleLogComplete = useRef((id: string) => {
    setCompletedTypedIds(prev => new Set(prev).add(id));
    if (logCompletionSubscribersRef.current[id]) {
      logCompletionSubscribersRef.current[id]();
      delete logCompletionSubscribersRef.current[id];
    }
  }).current;

  const firstUncompletedLogId = useMemo(() => {
    const found = reasoningLogs.find(log => !completedTypedIds.has(log.id));
    return found ? found.id : null;
  }, [reasoningLogs, completedTypedIds]);

  const waitForLogCompletion = (id: string) => {
    return new Promise<void>((resolve) => {
      setCompletedTypedIds(currentSet => {
        if (currentSet.has(id)) {
          resolve();
        } else {
          logCompletionSubscribersRef.current[id] = resolve;
        }
        return currentSet;
      });
    });
  };

  const completedLogsRef = useRef<Set<string>>(new Set());

  // Persist processed IDs across refreshes using localStorage
  const getPersistedProcessedIds = (): Set<string> => {
    try {
      const stored = localStorage.getItem('ciro_processed_ids');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  };
  const persistProcessedId = (id: string) => {
    try {
      const existing = getPersistedProcessedIds();
      existing.add(id);
      localStorage.setItem('ciro_processed_ids', JSON.stringify([...existing]));
    } catch {}
  };
  // Merge persisted IDs into in-memory ref on first mount
  const finalizedIncidentsRef = useRef<Set<string>>(getPersistedProcessedIds()); // AEGIS SECURITY LOCK

  // Agent Identification Map for Model IDs
  const agentModels: Record<string, string> = {
    'SIGNAL_AGENT': 'gemini-1.5-flash',
    'VALIDATION_AGENT': 'gemini-1.5-pro',
    'LOG_AGENT': 'gemini-1.5-flash',
    'DECISION_AGENT': 'gemini-1.5-pro',
    'OUTCOME_AGENT': 'gemini-1.5-flash',
    'SYSTEM_AGENT': 'vanguard-core-v2'
  };

  const [emergencyActive, setEmergencyActive] = useState(false);
  const [approvingReport, setApprovingReport] = useState<any>(null);
  const [approvalResolver, setApprovalResolver] = useState<any>(null);
  const [clusters, setClusters] = useState<{ lat: number; lng: number; severity: 'Critical' | 'High' | 'Medium' | 'Low' }[]>([]);
  const [focusLocation, setFocusLocation] = useState<[number, number] | null>(null);
  const [movingResources, setMovingResources] = useState<{ id: string; type: string; pos: [number, number]; target: [number, number] }[]>([]);
  const [backlogQueue, setBacklogQueue] = useState<Crisis[]>([]);
  const logScrollRef = useRef<HTMLDivElement>(null);
  const [totalProcessedCount, setTotalProcessedCount] = useState(0);
  const [totalBatchSize, setTotalBatchSize] = useState(0);

  // Initialize Queues
  useEffect(() => {
    if (crises.length > 0) {
      // Merge DB-processed + localStorage-persisted IDs into the finalized ref
      const persistedIds = getPersistedProcessedIds();
      const alreadyProcessed = crises.filter(c => c.status === 'Processed' || c.status === 'Solved');
      alreadyProcessed.forEach(c => {
        finalizedIncidentsRef.current.add(c.id);
        persistedIds.add(c.id);
      });

      // Filter out any report that is finalized (DB or localStorage)
      const unprocessedCrises = crises.filter(c => !finalizedIncidentsRef.current.has(c.id));

      // Add only new reports that aren't already in any queue
      const existingIds = new Set([
        ...incomingQueue.map(c => c.id),
        ...analyzingReports.map(c => c.id),
        ...processedReports.map(c => c.id),
        ...backlogQueue.map(c => c.id)
      ]);
      const newReports = unprocessedCrises.filter(c => !existingIds.has(c.id));
      if (newReports.length > 0) {
        setIncomingQueue(prev => [...prev, ...newReports]);
      }

      // Populate processedReports panel on first load
      if (alreadyProcessed.length > 0 && processedReports.length === 0) {
        setProcessedReports(alreadyProcessed);
      }
    }
  }, [crises]);

  const addLog = (text: string, agent: string, incidentId: string = "SYS-000", isComplete: boolean = false) => {
    if (!agent || !incidentId) return '';

    if (finalizedIncidentsRef.current.has(incidentId)) return '';

    const compositeKey = `${agent}-${incidentId}`;

    if (completedLogsRef.current.has(compositeKey)) return '';

    if (isComplete) {
      completedLogsRef.current.add(compositeKey);
    }

    const logId = Math.random().toString(36).substring(7);

    setReasoningLogs(prev => {
      const newLog = {
        id: logId,
        agent,
        text,
        incidentId,
        status: isComplete ? 'completed' as const : 'analyzing' as const,
        timestamp: new Date().toLocaleTimeString()
      };

      return [...prev, newLog].slice(-100);
    });

    return logId;
  };

  const handleManualResolve = (report: Crisis) => {
    setActiveTab('Operations');
    setIncomingQueue(prev => prev.filter(c => c.id !== report.id));
    setAnalyzingReports([report]);
    processReport(report);
  };

  const csvBatchCounter = useRef(0);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];
        const batchTimestamp = Date.now();
        csvBatchCounter.current++;

        // Map CSV data to Crisis objects and Clusters
        const mappedCrises: Crisis[] = data.map((row, idx) => {
          const lat = row.Lat || (30 + Math.random() * 4);
          const lng = row.Lng || (68 + Math.random() * 4);
          // Use multi-layered unique IDs to prevent collisions across multiple uploads or rapid processing
          return {
            id: `csv-${batchTimestamp}-${csvBatchCounter.current}-${idx}`,
            type: row.Type || 'Flood Alert',
            location: `${row.Area || 'Unknown Area'}, ${row.City || 'Unknown City'}`,
            severity: row.Severity || 'Medium',
            confidence: 'Analysing...',
            confidenceScore: 0.5,
            status: 'Reported',
            coordinates: [lat, lng]
          };
        });

        const mappedClusters = mappedCrises.map(c => ({
          lat: c.coordinates?.[0] || 0,
          lng: c.coordinates?.[1] || 0,
          severity: c.severity as any
        }));

        setClusters(mappedClusters);
        setIncomingQueue([]);
        setAnalyzingReports([]);
        setProcessedReports([]);
        setReasoningLogs([]); // Clear logs for a fresh batch
        setCompletedTypedIds(new Set());
        completedLogsRef.current.clear();
        finalizedIncidentsRef.current.clear();
        processingRef.current.clear();
        setBacklogQueue(mappedCrises);
        setTotalBatchSize(mappedCrises.length);
        setTotalProcessedCount(0);
        setEmergencyActive(true);
        addLog("[SYSTEM] CSV Data Injected. Potential Flood Emergency Pattern Detected.", "SYSTEM_AGENT");
      }
    });
  };

  const handleRealtimeTwitterSync = async () => {
    try {
      const res = await fetch('https://raw.githubusercontent.com/Adina-Abrar/Twitter-data/refs/heads/main/FloodsInPakistan-tweets.csv');
      const csvText = await res.text();

      Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as any[];
          const batchTimestamp = Date.now();
          csvBatchCounter.current++;

          // Map CSV data to Crisis objects
          const mappedCrises: Crisis[] = data.map((row, idx) => {
            const lat = row.Lat || row.lat || row.Latitude || row.latitude || (30 + Math.random() * 4);
            const lng = row.Lng || row.lng || row.Longitude || row.longitude || (68 + Math.random() * 4);
            const text = row.Tweet || row.tweet || row.text || row.Text || row.Type || row[Object.keys(row)[0]] || 'Flood Emergency Signal';
            const location = row.Location || row.location || row.Area || row.area || row.City || row.city || row.UserLocation || 'Pakistan (Twitter Signal)';

            const lowerText = `${text} ${location}`.toLowerCase();
            const isCritical = ['flood', 'earthquake', 'heatwave', 'accident', 'emergency', 'storm', 'fire', 'blast', 'critical'].some(kw => lowerText.includes(kw));

            return {
              id: `tw-${batchTimestamp}-${csvBatchCounter.current}-${idx}`,
              type: isCritical ? 'Critical Emergency' : 'Twitter Signal',
              details: typeof text === 'string' ? text.slice(0, 150) : 'Emergency signal detected',
              location: typeof location === 'string' ? location.slice(0, 50) : 'Pakistan',
              severity: isCritical ? 'Critical' : 'Medium',
              confidence: 'Analysing...',
              confidenceScore: isCritical ? 0.95 : 0.65,
              status: 'Reported',
              coordinates: [lat, lng]
            };
          });

          const hasCritical = mappedCrises.some(c => c.severity === 'Critical');

          const mappedClusters = mappedCrises.map(c => ({
            lat: c.coordinates?.[0] || 0,
            lng: c.coordinates?.[1] || 0,
            severity: c.severity as any
          }));

          setClusters(mappedClusters);
          setIncomingQueue([]);
          setAnalyzingReports([]);
          setProcessedReports([]);
          setReasoningLogs([]); // Clear logs for a fresh batch
          setCompletedTypedIds(new Set());
          completedLogsRef.current.clear();
          finalizedIncidentsRef.current.clear();
          processingRef.current.clear();
          setBacklogQueue(mappedCrises);
          setTotalBatchSize(mappedCrises.length);
          setTotalProcessedCount(0);

          if (hasCritical) {
            setEmergencyActive(true);
            addLog("[SYSTEM] Twitter Stream Injected. CRITICAL Emergency Signals Detected.", "SYSTEM_AGENT");
          } else {
            setIncomingQueue(mappedCrises);
            addLog("[SYSTEM] Twitter Stream Injected. Routine signals queued.", "SYSTEM_AGENT");
          }
        }
      });
    } catch (err) {
      console.error('Failed to sync Twitter CSV:', err);
    }
  };

  const analyzeCSVReports = async () => {
    if (backlogQueue.length === 0) return;

    setEmergencyActive(false);

    // AEGIS: Clear any stale processing markers
    processingRef.current.clear();

    // AEGIS: Just fill the incoming queue and let the managed pipeline (useEffect) 
    // handle the analysis flow. This prevents race conditions and duplicate processing.
    setIncomingQueue(prev => [...prev, ...backlogQueue]);
    setBacklogQueue([]);

    addLog("[SIGNAL_AGENT] Initiating batch analysis of injected signals...", "SIGNAL_AGENT");
  };

  const processReport = async (report: Crisis) => {
    if (finalizedIncidentsRef.current.has(report.id)) return;

    const agentNames = {
      VALIDITY: 'VALIDATION_AGENT',
      ANALYSIS: 'SITUATION_AGENT',
      DECISION: 'DECISION_AGENT',
      OUTCOME: 'EXECUTOR_AGENT'
    };

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
    const reportPartId = report.id.includes('-') ? report.id.split('-')[1] : report.id;
    const incidentId = `INC-${reportPartId.padStart(3, '0')}`;

    const hasDetails = report.location !== 'No additional details provided';

    try {
      if (stopAnalysisRef.current) return;

      // AGENT 1: VALIDATION & CONFIDENCE SCORER
      const agent1Reasoning = `[REASONING]
1. Verifying coordinates [${report.coordinates?.join(', ') || 'N/A'}] against ${report.location}.
2. Checking validity of incident type '${report.type}' within v2.0 constraints.
3. DATA CHECK: ${hasDetails ? 'Descriptive payload detected.' : 'WARNING: No additional details provided. Constraints enforced.'}
4. Scanning database cluster for duplicates in ${report.location} vicinity.
5. Calculating score based on payload integrity.`;

      const id1 = addLog(agent1Reasoning, agentNames.VALIDITY, incidentId);
      if (id1) await waitForLogCompletion(id1);
      if (stopAnalysisRef.current) return;
      await delay(500);

      const score = hasDetails ? 0.92 : 0.74;
      const id2 = addLog(`[OUTPUT] { "verified": true, "confidence_score": ${score}, "missing_fields": ["${hasDetails ? 'none' : 'details'}"] }`, agentNames.VALIDITY, incidentId);
      if (id2) await waitForLogCompletion(id2);
      if (stopAnalysisRef.current) return;
      await delay(1000);

      // AGENT 2: SITUATION UNDERSTANDING SPECIALIST
      let infra = 'Environment';
      if (report.type.toLowerCase().includes('power') || report.type.toLowerCase().includes('utility')) infra = 'Utility';
      else if (report.type.toLowerCase().includes('road') || report.type.toLowerCase().includes('blockage')) infra = 'Transit';
      else if (report.type.toLowerCase().includes('medical') || report.type.toLowerCase().includes('accident')) infra = 'Health';

      const agent2Reasoning = `[REASONING]
1. Hazard Category: ${report.type} (Strictly bound to report).
2. Infrastructure Mapping: ${infra} dependency identified.
3. CONSTRAINT EVALUATION: ${hasDetails ? 'Full situational scope applied.' : 'Limited detail acknowledges narrow situational awareness.'}
4. Resource Archetype: Identifying specialized ${infra} units.`;

      const id3 = addLog(agent2Reasoning, agentNames.ANALYSIS, incidentId);
      if (id3) await waitForLogCompletion(id3);
      if (stopAnalysisRef.current) return;
      await delay(500);

      const id4 = addLog(`[OUTPUT] { "primary_hazard": "${report.type}", "infrastructure_affected": "${infra}", "localized_context_notes": "${hasDetails ? 'Normalizing regional context.' : 'Observation limited to primary hazard signal.'}", "requires_immediate_dispatch": ${report.severity === 'Critical'} }`, agentNames.ANALYSIS, incidentId);
      if (id4) await waitForLogCompletion(id4);
      if (stopAnalysisRef.current) return;
      await delay(1000);

      // AGENT 3: CRISIS DECISION MAKER
      const agent3Reasoning = `[REASONING]
1. Risk Triage: Evaluating ${report.severity} tier for ${report.type}.
2. Cascading Failure Check: Analyzing potential ${infra} blackout impact.
3. Domain Allocation: Routing ${infra} specialists for sector resolution.
4. Strategy: Formulating non-generic deployment path.`;

      const id5 = addLog(agent3Reasoning, agentNames.DECISION, incidentId);
      if (id5) await waitForLogCompletion(id5);
      if (stopAnalysisRef.current) return;
      await delay(500);

      const needsApproval = report.severity === 'Critical' || report.type === 'Urban Flooding';

      if (needsApproval) {
        const id6 = addLog(`[DECISION] Action: HIGH-PRIORITY ${infra.toUpperCase()} DEPLOYMENT. Awaiting Admin Approval...`, agentNames.DECISION, incidentId);
        if (id6) await waitForLogCompletion(id6);

        const approved = await new Promise((resolve) => {
          setApprovingReport({ ...report, incidentId });
          setApprovalResolver(() => resolve);
        });

        if (!approved || stopAnalysisRef.current) {
          const id7 = addLog(`[OUTPUT] { "priority_level": "Low", "recommended_action": "Standby", "target_departments": ["Command"], "estimated_resolution_timeframe": "N/A" }`, agentNames.DECISION, incidentId);
          if (id7) await waitForLogCompletion(id7);
          return;
        } else {
          const id8 = addLog(`[OUTPUT] { "priority_level": "Critical", "recommended_action": "Sector Dispatch", "target_departments": ["${infra}"], "estimated_resolution_timeframe": "1.5 hours" }`, agentNames.DECISION, incidentId);
          if (id8) await waitForLogCompletion(id8);
          if (stopAnalysisRef.current) return;
          await delay(1000);
        }
      } else {
        const id9 = addLog(`[OUTPUT] { "priority_level": "Medium", "recommended_action": "Routine Resolution", "target_departments": ["${infra}"], "estimated_resolution_timeframe": "3 hours" }`, agentNames.DECISION, incidentId);
        if (id9) await waitForLogCompletion(id9);
        if (stopAnalysisRef.current) return;
        await delay(1000);
      }

      // AGENT 4: OUTCOME & ACTION EXECUTOR
      const agent4Reasoning = `[REASONING]
1. Mapping strategic decision to ${infra} field responders.
2. Field Instructions: Non-generic directive for ${report.location} coordinates.
3. DATABASE COMMIT: Initiating PATCH /api/incidents/${report.id} to state 'Processed'.
4. Public Payload: Constructing ${infra} status alert for regional broadcast.`;

      const id10 = addLog(agent4Reasoning, agentNames.OUTCOME, incidentId);
      if (id10) await waitForLogCompletion(id10);
      if (stopAnalysisRef.current) return;

      // REAL DATABASE UPDATE
      try {
        await fetch(`/api/incidents/${report.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Processed' })
        });
      } catch (e) {
        console.warn('API update failed, continuing simulation.', e);
      }

      await delay(500);
      const id11 = addLog(`[OUTPUT] { "updated_status": "Processed", "field_responder_instructions": "Proceed to ${report.location} for ${infra} stabilization.", "public_alert_issued": true, "alert_payload": { "title": "${report.type} Resolution", "body": "Sector ${report.location} successfully handled by ${infra} teams." } }`, agentNames.OUTCOME, incidentId);
      if (id11) await waitForLogCompletion(id11);

      // Finalize UI — persist to localStorage so refresh won't re-queue this report
      finalizedIncidentsRef.current.add(report.id);
      persistProcessedId(report.id);
      setAnalyzingReports(prev => prev.filter(p => p.id !== report.id));
      setProcessedReports(prev => [{ ...report, status: 'Processed', confidenceScore: score }, ...prev].slice(0, 50));
      setTotalProcessedCount(prev => prev + 1);

    } catch (err) {
      console.error('Agent failure:', err);
    }
  };

  const processingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Stopped automatic processing as requested by Admin
    // AI Agents now wait for manual trigger or specific 'Agents' tab activation
    if (activeTab === 'Agents' && analyzingReports.length === 0 && incomingQueue.length > 0) {
      // Just show a notification/toast that cases are pending
      const pendingCount = incomingQueue.length;
      if (pendingCount > 0) {
        console.log(`[VANGUARD] ${pendingCount} pending cases awaiting admin review.`);
      }
    }
  }, [activeTab, incomingQueue, analyzingReports]);

  const triggerAIAnalysis = async () => {
    if (incomingQueue.length === 0) return;

    const batchToProcess = [...incomingQueue];
    setIncomingQueue([]); // Move all to processing state

    for (let i = 0; i < batchToProcess.length; i++) {
      if (stopAnalysisRef.current) {
        setIncomingQueue(prev => [...batchToProcess.slice(i), ...prev]);
        setAnalyzingReports([]);
        stopAnalysisRef.current = false;
        return;
      }

      const report = batchToProcess[i];
      const reportPartId = report.id.includes('-') ? report.id.split('-')[1] : report.id;

      // Update UI to show only the current report in 'Analyzing'
      setAnalyzingReports([report]);
      addLog(`[SYSTEM] PROCESSING INCIDENT ${i + 1} OF ${batchToProcess.length} (ID: #INC-${reportPartId})`, "SYSTEM_AGENT", `INC-${reportPartId}`);

      // Wait for the full 4-agent lifecycle to complete before moving to next
      await processReport(report);

      // Optional small delay between incidents for visual clarity
      await new Promise(res => setTimeout(res, 1000));
    }

    setAnalyzingReports([]);
    addLog(`[SYSTEM] BATCH PROCESSING COMPLETE. ALL ${batchToProcess.length} INCIDENTS RESOLVED.`, "SYSTEM_AGENT", "BATCH-COMPLETE");
  };

  const renderOperations = () => (
    <div className="flex-1 flex overflow-hidden bg-slate-50">
      {/* 1. Incoming Queue & Lifecycle (Left) */}
      <aside className="w-[300px] border-r border-slate-200 flex flex-col bg-white overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Incoming */}
          <div className="shrink-0 p-4 bg-slate-50 border-b border-slate-100">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex justify-between">
              Incoming Queue <span>{incomingQueue.length}</span>
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {isLoadingCrises ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 rounded-xl border border-slate-100 bg-white/50 animate-pulse h-12"></div>
              ))
            ) : (
              incomingQueue.map(crisis => (
                <div key={crisis.id} onClick={() => navigate(`/report-detail/${crisis.id}`)} className="p-3 rounded-xl border border-slate-100 bg-white opacity-60 cursor-pointer hover:opacity-100 transition-all">
                  <p className="text-[10px] font-black text-slate-900">#INC-{crisis.id.includes('-') ? crisis.id.split('-')[1] : crisis.id}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">{crisis.type}</p>
                </div>
              ))
            )}
          </div>

          {/* Analyzing */}
          <div className="shrink-0 p-4 bg-teal-50/50 border-y border-teal-100">
            <h2 className="text-[10px] font-black text-teal-600 uppercase tracking-[0.2em] flex justify-between items-center">
              Analyzing Signals
              <span className="flex gap-1">
                <span className="w-1 h-1 bg-teal-500 rounded-full animate-ping"></span>
                <span className="w-1 h-1 bg-teal-500 rounded-full animate-ping delay-75"></span>
              </span>
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {analyzingReports.map(crisis => (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                key={crisis.id}
                className="p-3 rounded-xl border-2 border-teal-200 bg-teal-50/20"
              >
                <p className="text-[10px] font-black text-teal-900">#INC-{crisis.id.includes('-') ? crisis.id.split('-')[1] : crisis.id}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1 flex-1 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500 animate-progress-fast"></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </aside>

      {/* 2. Command View (Center) */}
      <main className="flex-1 overflow-hidden flex flex-col bg-slate-50 relative">
        {/* Emergency Overlay */}
        <AnimatePresence>
          {emergencyActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="absolute inset-0 z-[50] flex flex-col items-center justify-center bg-white/80 backdrop-blur-md p-10 text-center"
            >
              <AlertOctagon className="w-24 h-24 text-red-600 mb-6 animate-pulse" />
              <h1 className="text-5xl font-black text-red-600 mb-4">
                EMERGENCY DETECTED: COORDINATED RESPONSE REQUIRED
              </h1>
              <p className="text-xl font-bold text-slate-600 mb-10 max-w-xl">
                Anomalous spike in signals detected from CSV injection. Priority Agent protocols required.
              </p>
              <button
                onClick={analyzeCSVReports}
                className="bg-red-600 text-white px-10 py-5 rounded-3xl text-xl font-black uppercase tracking-widest shadow-2xl shadow-red-200 hover:bg-red-700 active:scale-95 transition-all"
              >
                Analyze Reports
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="shrink-0 p-6 border-b border-slate-200 flex justify-between items-center bg-white">
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Active Command Theater</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Asset Deployment Floor</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={stopAnalysis}
              className="bg-red-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-red-100 hover:bg-red-700 transition-all"
            >
              Stop Analysis
            </button>
            <button
              onClick={triggerAIAnalysis}
              disabled={incomingQueue.length === 0}
              className="bg-teal-600 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-teal-100 hover:bg-teal-700 transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              Analyze Queue
            </button>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          {selectedCrisis || incomingQueue.length > 0 || analyzingReports.length > 0 ? (
            <div className="max-w-[1200px] mx-auto space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-4">
                  {selectedCrisis && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xl relative overflow-hidden">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-[9px] font-black text-teal-600 uppercase tracking-[0.3em] mb-2 block">Selected assessment</span>
                          <h2 className="text-lg font-display font-black text-slate-900 tracking-tight leading-snug">
                            {selectedCrisis.type}: {selectedCrisis.location}
                          </h2>
                        </div>
                        <div className="bg-slate-50 p-2.5 px-3 rounded-2xl border border-slate-100 flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Confidence</p>
                            <p className="text-lg font-black text-teal-600">{selectedCrisis.confidenceScore * 100}%</p>
                          </div>
                          <div className="w-8 h-8 bg-teal-muted rounded-xl flex items-center justify-center text-white shrink-0">
                            <Shield className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button className="bg-teal-600 text-white py-2.5 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-teal-100 hover:bg-teal-700 active:scale-95 transition-all">Authorize Assets</button>
                        <button className="bg-slate-100 text-slate-600 py-2.5 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Reject Signal</button>
                      </div>
                    </div>
                  )}

                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-3">In-Queue Processing Status</h3>
                    <div className="space-y-4">
                      {analyzingReports.map(report => (
                        <div key={report.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div>
                            <p className="text-[10px] font-black text-slate-800 uppercase">#CSV-{report.id.includes('-') ? report.id.split('-')[1] : report.id}</p>
                            <p className="text-sm font-bold text-slate-500">{report.location}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black text-teal-600 uppercase mb-1 flex items-center gap-1 justify-end">
                              <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-ping"></span>
                              Active Analytics
                            </p>
                            <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-teal-500 animate-progress-fast"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-900 p-5 rounded-2xl text-white flex flex-col justify-between min-h-[180px]">
                    <div className="flex justify-between items-start">
                      <h3 className="text-[9px] font-black uppercase tracking-widest text-white/40">Vanguard AI Hub</h3>
                      <Database className="w-4 h-4 text-teal-400" />
                    </div>
                    <div className="my-3">
                      <div className="text-2xl font-display font-black text-teal-400 mb-1">CI-300</div>
                      <p className="text-[9px] font-bold text-white/60 leading-relaxed uppercase tracking-tight">Priority deployment authorized by autonomous agent protocols.</p>
                    </div>
                    <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                      <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Protocol: Active_Defense</p>
                      <div className="flex gap-1">
                        <div className="w-1 h-1 bg-teal-400 rounded-full animate-pulse"></div>
                        <div className="w-1 h-1 bg-teal-400 rounded-full animate-pulse delay-75"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-24 h-24 bg-teal-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-teal-600/20">
                  <Activity className="w-10 h-10" />
                </div>
                <p className="text-sm font-black text-slate-300 uppercase tracking-[0.4em]">System Ready for Injection</p>
                <p className="text-[10px] font-bold text-slate-400 mt-2">Use Real-time Sync to initiate Vanguard CIRO Emergency State</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 3. Log Agent - The Narrator (Right) */}
      <aside className="w-[280px] border-l border-slate-200 flex flex-col bg-white shadow-2xl relative z-10 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Agent Log</h2>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 font-mono">Real-Time Core</span>
            </div>
          </div>
          <p className="text-[10px] font-bold text-slate-300 font-mono">VANGUARD CIRO • MULTI-AGENT ARCHITECTURE</p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 bg-white" ref={logScrollRef}>
          {reasoningLogs?.map((log) => {
            const isCompleted = completedTypedIds.has(log.id);
            const isTyping = !isCompleted && log.id === firstUncompletedLogId;
            const isWaiting = !isCompleted && log.id !== firstUncompletedLogId;

            if (isWaiting) return null;

            return (
              <div key={log.id} className="group border-b border-slate-50 pb-4 last:border-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${log.status === 'analyzing' ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <span className="text-[10px] font-black text-slate-900 font-mono uppercase tracking-widest">{log.agent.replace(/_AGENT|_/g, ' ')}</span>
                  <span className="text-[9px] font-bold text-slate-400 font-mono tracking-tighter">[{log.incidentId}]</span>
                  <span className="text-[9px] font-bold text-slate-300 font-mono ml-auto">{log.timestamp}</span>
                </div>
                <p className="text-[12px] font-medium text-slate-700 leading-relaxed font-mono whitespace-pre-wrap pl-3.5 border-l-2 border-slate-50 group-hover:border-blue-100 transition-colors">
                  <TypewriterLog
                    id={log.id}
                    text={log.text}
                    status={log.status}
                    isTyping={isTyping}
                    isWaiting={isWaiting}
                    isCompleted={isCompleted}
                    onComplete={handleLogComplete}
                  />
                </p>
              </div>
            );
          })}
          <div id="scroll-anchor" className="h-1"></div>
        </div>
      </aside>

      {/* Approval Modal */}
      <AnimatePresence>
        {approvingReport && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-8 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldAlert className="w-6 h-6" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">Decision Approval Required</span>
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Support Deployment Request</h2>
                <p className="text-teal-100 text-xs font-bold mt-1">Agent 3 (DECISION_AGENT) requires admin authorization to dispatch response units.</p>
              </div>

              <div className="p-8 space-y-6">
                {/* Reporter + Incident Profile */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Incident Profile</p>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-black text-sm shrink-0">
                      {(approvingReport.reporterName || 'A')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800">Reported by: {approvingReport.reporterName || 'Anonymous'}</p>
                      <p className="text-[10px] font-bold text-slate-400">{approvingReport.type} · {approvingReport.severity} Severity</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 font-bold">
                    <span className="text-slate-400">Location: </span>{approvingReport.location}
                  </p>
                </div>

                {/* Confidence Score */}
                <div className="flex items-center gap-4 bg-teal-50 rounded-2xl p-4 border border-teal-100">
                  <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center shrink-0">
                    <Activity className="w-6 h-6 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-teal-700 uppercase tracking-widest mb-1">AI Confidence Score</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-teal-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all"
                          style={{ width: `${Math.round((approvingReport.confidenceScore || 0.5) * 100)}%` }}
                        />
                      </div>
                      <span className="text-lg font-black text-teal-700 tabular-nums">
                        {Math.round((approvingReport.confidenceScore || 0.5) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Agent 3 Decision */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight mb-1">Agent 3 Recommendation</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Based on the <strong>{approvingReport.severity}</strong> severity classification and <strong>{approvingReport.type}</strong> incident type,
                      the Decision Agent recommends dispatching <strong>Logistics & Medical</strong> support teams to {approvingReport.location}.
                      Estimated resolution timeframe: <strong>1.5 hours</strong>.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => {
                      approvalResolver(false);
                      setApprovingReport(null);
                    }}
                    className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => {
                      approvalResolver(true);
                      setApprovingReport(null);
                    }}
                    className="flex-1 py-4 rounded-2xl bg-teal-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-teal-100 hover:bg-teal-700 transition-all"
                  >
                    ✓ Approve Deployment
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );

  interface LogParagraphProps {
    agent: string;
    text: string;
    incidentId: string;
    status: 'analyzing' | 'completed';
    timestamp: string;
  }

  const HealthMetric = ({ label, value, status }: { label: string, value: string | number, status: string }) => {
    const statusColor = {
      green: 'bg-green-500 shadow-green-200',
      yellow: 'bg-yellow-500 shadow-yellow-200',
      red: 'bg-red-500 shadow-red-200'
    }[status as 'green' | 'yellow' | 'red'] || 'bg-slate-300';

    return (
      <div className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors px-1 rounded-lg">
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full ${statusColor} shadow-[0_0_8px_rgba(0,0,0,0.1)]`}></div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">{label}</span>
        </div>
        <span className="text-[11px] font-black text-slate-900 font-mono tabular-nums leading-none">{value}</span>
      </div>
    );
  };

  const SystemHealthWidget = ({ stats }: { stats: any }) => {
    return (
      <div
        className="bg-white/95 backdrop-blur-xl p-4 rounded-[1.5rem] border border-slate-200/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] w-60 overflow-hidden"
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">System Health</h3>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Live Metrics</p>
            </div>
          </div>
          <div className="relative flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]"></div>
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping opacity-75"></div>
          </div>
        </div>
        <div className="space-y-1.5">
          <HealthMetric label="CPU Load" value={`${stats.serverLoad.value}%`} status={stats.serverLoad.status} />
          <HealthMetric label="DB Pool" value={stats.dbConnections.value} status={stats.dbConnections.status} />
          <HealthMetric label="API Resp" value={`${stats.apiLatency.value}ms`} status={stats.apiLatency.status} />
        </div>
        <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center text-[8px] font-bold text-slate-400 uppercase font-mono tracking-widest opacity-60">
          <span>Uptime</span>
          <span>99.98%</span>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    const globalMarkers = [
      { id: '1', longitude: -118.2437, latitude: 34.0522, status: 'Critical' as const },
      { id: '2', longitude: -122.4194, latitude: 37.7749, status: 'Moderate' as const },
      { id: '3', longitude: -121.4944, latitude: 38.5816, status: 'Safe' as const },
      { id: '4', longitude: -74.006, latitude: 40.7128, status: 'Moderate' as const },
      { id: '5', longitude: -77.0369, latitude: 38.9072, status: 'Safe' as const },
      { id: '6', longitude: -0.1276, latitude: 51.5074, status: 'Moderate' as const },
      { id: '7', longitude: 2.3522, latitude: 48.8566, status: 'Safe' as const },
      { id: '8', longitude: 12.4964, latitude: 41.9028, status: 'Critical' as const },
      { id: '9', longitude: 120.9842, latitude: 14.5995, status: 'Critical' as const },
      { id: '10', longitude: 121.0500, latitude: 14.7000, status: 'Critical' as const },
      { id: '11', longitude: 121.1000, latitude: 14.5000, status: 'Critical' as const },
      { id: '12', longitude: 120.8000, latitude: 14.4000, status: 'Critical' as const },
      { id: '13', longitude: 139.6917, latitude: 35.6895, status: 'Moderate' as const },
      { id: '14', longitude: 100.5018, latitude: 13.7563, status: 'Critical' as const },
      { id: '15', longitude: 114.1694, latitude: 22.3193, status: 'Moderate' as const },
    ];

    const liveIncidents = [
      { id: '#V-0981', op: 'Manila Flood Evac', status: 'Active', statusBg: 'bg-yellow-100 text-yellow-800 border border-yellow-200', agents: '34 Agents', loc: 'Manila', risk: 'Critical', riskBg: 'bg-red-100 text-red-800 border border-red-200' },
      { id: '#V-1002', op: 'CA Wildfire Response', status: 'Deploying', statusBg: 'bg-green-100 text-green-800 border border-green-200', agents: '34 Agents', loc: 'Los Angeles', risk: 'Critical', riskBg: 'bg-red-100 text-red-800 border border-red-200' },
      { id: '#V-1003', op: 'CA Wildfire Response', status: 'Deploying', statusBg: 'bg-green-100 text-green-800 border border-green-200', agents: '34 Agents', loc: 'Los Angeles', risk: 'Critical', riskBg: 'bg-red-100 text-red-800 border border-red-200' },
      { id: '#V-0984', op: 'Manila Flood Evac', status: 'Active', statusBg: 'bg-yellow-100 text-yellow-800 border border-yellow-200', agents: '34 Agents', loc: 'Manila', risk: 'Critical', riskBg: 'bg-red-100 text-red-800 border border-red-200' },
      { id: '#V-1005', op: 'CA Wildfire Response', status: 'Deploying', statusBg: 'bg-green-100 text-green-800 border border-green-200', agents: '34 Agents', loc: 'Los Angeles', risk: 'Critical', riskBg: 'bg-red-100 text-red-800 border border-red-200' },
    ];

    const statusChartData = [
      { name: 'Online', count: 850, fill: '#84cc16' },
      { name: 'On Mission', count: 600, fill: '#eab308' },
      { name: 'Available', count: 350, fill: '#cbd5e1' },
      { name: 'Offline', count: 150, fill: '#ef4444' },
    ];

    const regionChartData = [
      { name: 'Mectia', count: 38, fill: '#84cc16' },
      { name: 'Evast', count: 23, fill: '#ef4444' },
      { name: 'Available', count: 18, fill: '#cbd5e1' },
      { name: 'Offline', count: 8, fill: '#eab308' },
    ];

    const operationalFeed = [
      { id: '1', type: 'alert', title: 'Alerts', text: '#ALERT: V-0981 Manila Flood: Water levels rising', time: '14 mins ago' },
      { id: '2', type: 'alert', title: 'Alerts', text: '#ALERT: V-0981 Caxtion Respons: Water levels rising', time: '10 mins ago' },
      { id: '3', type: 'update', title: 'Agent updates', text: '#UPDATE: Agent unit deployed to CA Wildfire Zone 3', time: '5 mins ago' },
      { id: '4', type: 'update', title: 'Agent updates', text: '#UPDATE: Agent unit deployed to CA Wildfire Zone 3', time: '3 mins ago' },
      { id: '5', type: 'milestone', title: 'Mission milestones', text: '#UPDATE: Agent unit deployed to CA Wildfire Zone 1', time: '2 mins ago' },
      { id: '6', type: 'milestone', title: 'Mission milestones', text: '#UPDATE: Agent unit deployed to CA Wildfire Zone 3', time: '1 min ago' },
    ];

    return (
      <div className="flex-1 flex overflow-hidden bg-[#f1f5f9] p-6 gap-6 custom-scrollbar overflow-y-auto">
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
            {/* Card 1: Active Incidents */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Active Incidents</p>
                <h3 className="text-3xl font-black text-slate-800 mb-1">24</h3>
                <p className="text-xs font-bold text-slate-500">High Priority</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
            </div>

            {/* Card 2: Deployed Agents */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Deployed Agents</p>
                <h3 className="text-3xl font-black text-slate-800 mb-1">156 / 210</h3>
                <p className="text-xs font-bold text-slate-500">Online Status</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>

            {/* Card 3: Ongoing Missions */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Ongoing Missions</p>
                <h3 className="text-3xl font-black text-slate-800 mb-1">9</h3>
                <p className="text-xs font-bold text-slate-500">Critical Ops</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner">
                <Target className="w-6 h-6" />
              </div>
            </div>

            {/* Card 4: Alert Status */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">Alert Status</p>
                <h3 className="text-2xl font-black text-red-600 mb-1">RED (LEVEL 4)</h3>
                <p className="text-xs font-bold text-slate-500">Heatmap</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shadow-inner animate-bounce">
                <Flame className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Center Map Area */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[450px] shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Current Global Incidents</h3>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Critical
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"></span> Moderate
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span> Safe
                </span>
              </div>
            </div>
            <div className="flex-1 relative rounded-xl overflow-hidden">
              <AdminMapLibre markers={globalMarkers} />
            </div>
          </div>

          {/* Bottom Row: Table & Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
            {/* Live Incident Monitor Table */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Live Incident Monitor (Top 5 Active Ops)</h3>
                <MoreVertical className="w-4 h-4 text-slate-400 cursor-pointer" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                      <th className="py-3 px-4">Incident ID</th>
                      <th className="py-3 px-4">Operation</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Agents</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Risk Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-700">
                    {liveIncidents.map((inc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 text-blue-600 font-black">{inc.id}</td>
                        <td className="py-3.5 px-4 text-slate-800">{inc.op}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider inline-block ${inc.statusBg}`}>
                            {inc.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{inc.agents}</td>
                        <td className="py-3.5 px-4 text-slate-800">{inc.loc}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider inline-block ${inc.riskBg}`}>
                            {inc.risk}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Agent Deployment Overview Charts */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-6">Agent Deployment Overview</h3>
              <div className="grid grid-cols-2 gap-6 flex-1">
                {/* Status Bar Chart */}
                <div className="flex flex-col">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Agents by Status</p>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} stroke="#94a3b8" />
                        <YAxis fontSize={10} axisLine={false} tickLine={false} stroke="#94a3b8" />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 'bold' }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Region Bar Chart */}
                <div className="flex flex-col">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">Response Units by Region</p>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={regionChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} stroke="#94a3b8" />
                        <YAxis fontSize={10} axisLine={false} tickLine={false} stroke="#94a3b8" />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 'bold' }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Operational Feed & Notifications */}
        <div className="w-[320px] bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col shrink-0">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-6 pb-4 border-b border-slate-100">
            Operational Feed & Notifications
          </h3>
          <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
            {operationalFeed.map(item => (
              <div key={item.id} className="flex items-start gap-4 group">
                <div className="mt-1 shrink-0">
                  {item.type === 'alert' && (
                    <div className="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center text-red-600 border border-red-200">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {item.type === 'update' && (
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 border border-emerald-200">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </div>
                  )}
                  {item.type === 'milestone' && (
                    <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 border border-amber-200">
                      <Activity className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-800 mb-1">{item.title}</p>
                  <p className="text-xs font-bold text-slate-600 leading-relaxed mb-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {item.text}
                  </p>
                  <span className="text-[10px] font-bold text-slate-400 block">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderReports = () => (
    <div className="flex-1 bg-white p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Submitted & Processed Reports</h1>
            <div className="h-1 w-20 bg-teal-muted rounded-full mb-2"></div>
            <p className="text-xs font-bold text-slate-500">Overview of all incident reports logged in the system</p>
          </div>
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search reporter, type, location..."
                className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none w-64 focus:border-teal-500 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reporter Name</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Incident Type</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Severity</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Confidence</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                  <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-700">
                {crises.map(report => (
                  <tr key={report.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-black text-slate-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-black text-xs">
                        {(report.reporterName || 'A')[0].toUpperCase()}
                      </div>
                      {report.reporterName || 'Anonymous'}
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-800">{report.type}</td>
                    <td className="py-4 px-6 text-slate-600 max-w-xs truncate">{report.location}</td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        report.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                        report.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                        report.severity === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {report.severity}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-500" style={{ width: `${report.confidenceScore * 100}%` }}></div>
                        </div>
                        <span>{Math.round(report.confidenceScore * 100)}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block ${
                        report.status === 'Processed' || report.status === 'Solved' ? 'bg-green-100 text-green-700' :
                        report.status === 'Processing' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {report.status || 'Submitted'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => navigate(`/report-detail/${report.id}`)}
                        className="px-4 py-1.5 bg-slate-100 hover:bg-teal-600 hover:text-white text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="flex-1 bg-[#121212] flex flex-col overflow-y-auto custom-scrollbar p-6 lg:p-10 text-white">
      <div className="max-w-[1600px] mx-auto w-full">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-display font-black uppercase tracking-tight">Real-Time Situational Analytics</h1>
            <p className="text-xs font-bold text-teal-muted uppercase tracking-[0.2em] mt-2">Live Incident Data Processing & Prediction</p>
          </div>
          <div className="flex gap-4">
            <button className="bg-white/5 border border-white/10 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all">Export Report</button>
            <div className="bg-teal-muted px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
              Live Sync
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Trend Chart */}
          <div className="lg:col-span-2 xl:col-span-2 bg-white/5 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black uppercase tracking-tight">Incident Intensity & Risk Trend</h3>
              <div className="flex gap-2">
                <span className="text-[10px] font-black text-teal-muted bg-teal-muted/10 px-3 py-1 rounded-full uppercase">Real-Time</span>
              </div>
            </div>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData.line}>
                  <defs>
                    <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#607274" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#607274" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#ffffff20', borderRadius: '12px', fontSize: '10px' }}
                    itemStyle={{ color: '#fff', fontWeight: '900', textTransform: 'uppercase' }}
                  />
                  <Area type="monotone" dataKey="reports" stroke="#0D9488" fillOpacity={1} fill="url(#colorReports)" strokeWidth={3} />
                  <Area type="monotone" dataKey="risk" stroke="#EF4444" fillOpacity={1} fill="url(#colorRisk)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Distribution Pie */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
            <h3 className="text-lg font-black uppercase tracking-tight mb-8 text-center">Outcome Distribution</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData.pie}
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {analyticsData.pie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 space-y-4">
              {analyticsData.pie.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{item.name}</span>
                  </div>
                  <span className="text-xs font-black">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category Bar Chart */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
            <h3 className="text-lg font-black uppercase tracking-tight mb-8">Incident Types</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.bar} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#fff" fontSize={10} width={80} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0D9488" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Radar */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem]">
            <h3 className="text-lg font-black uppercase tracking-tight mb-8 text-center">System Efficiency</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analyticsData.radar}>
                  <PolarGrid stroke="#ffffff10" />
                  <PolarAngleAxis dataKey="subject" stroke="#607274" fontSize={10} />
                  <Radar name="System A" dataKey="A" stroke="#0D9488" fill="#0D9488" fillOpacity={0.6} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Key Metrics Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col justify-center text-center">
              <p className="text-[10px] font-black text-teal-muted uppercase tracking-widest mb-1">Average Response</p>
              <h4 className="text-3xl font-display font-black text-white">4.2m</h4>
              <p className="text-[9px] font-bold text-green-500 mt-1">↓ 12% vs LY</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col justify-center text-center">
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Resource Drain</p>
              <h4 className="text-3xl font-display font-black text-white">78%</h4>
              <p className="text-[9px] font-bold text-red-500 mt-1">↑ 5% Urgent</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col justify-center text-center col-span-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Reported Incidents</p>
              <h4 className="text-4xl font-display font-black text-white">1,482</h4>
              <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-teal-muted w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTo({
        top: logScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [reasoningLogs]);

  const renderSettings = () => {
    const [settingsTab, setSettingsTab] = [
      '1. User & Security',
      '2. Incident Config',
      '3. Communication',
      '4. Integrations',
      '5. System & Brand',
      '6. Diagnostics'
    ];

    const systemLogs = [
      { time: '14:26:01', text: "Umais (Chief Orchestrator) viewed 'User Management' settings." },
      { time: '14:26:30', text: "Umais updated permissions for role: 'Crisis Manager'." },
      { time: '14:27:15', text: "SSO Integration parameters updated for provider: 'Active Directory'." },
      { time: '14:28:05', text: 'Audit log successfully exported (Last 30 Days).' },
      { time: '14:28:40', text: "Umais navigated to 'System Information' diagnostics." },
      { time: '14:29:10', text: 'Diagnostic check complete: All modules operational.' },
    ];

    const rbacRoles = [
      { name: 'Crisis Manager', role: true, read: true, write: true },
      { name: 'Responder', role: true, read: true, write: false },
      { name: 'Auditor', role: true, read: true, write: false },
    ];

    const tabs = ['1. User & Security', '2. Incident Config', '3. Communication', '4. Integrations', '5. System & Brand', '6. Diagnostics'];

    return (
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f1f5f9]">
        {/* Main Settings Area */}
        <div className="p-8">
          {/* Page Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-800 mb-1">Settings</h2>
            <p className="text-sm text-slate-500 font-medium">Configure Vanguard CIRO platform parameters and integrations.</p>
          </div>

          {/* Tab Bar */}
          <div className="flex gap-1 mb-8 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  tab === '1. User & Security'
                    ? 'bg-slate-800 text-white shadow-md'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Row 1: RBAC + Authentication + Third-parties */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            {/* RBAC Editor */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-800">RBAC editor</h3>
                <button className="px-3 py-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-emerald-600 transition-colors cursor-pointer">
                  Search Role
                </button>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="text-left pb-2">Role</th>
                    <th className="text-center pb-2">Role</th>
                    <th className="text-center pb-2">read</th>
                    <th className="text-center pb-2">Write</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rbacRoles.map((r) => (
                    <tr key={r.name} className="text-slate-700">
                      <td className="py-2.5 font-bold text-xs">{r.name}</td>
                      <td className="py-2.5 text-center text-emerald-500">✓</td>
                      <td className="py-2.5 text-center text-emerald-500">✓</td>
                      <td className="py-2.5 text-center">{r.write ? <span className="text-emerald-500">✓</span> : <span className="text-slate-300">✓</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="mt-4 w-full py-2.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-emerald-600 transition-colors cursor-pointer">
                Create New Role
              </button>
            </div>

            {/* Authentication */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-black text-slate-800 mb-4">Authentication</h3>
              {/* MFA Toggle */}
              <div className="flex items-center justify-between mb-5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-bold text-slate-700">Enable Multi-Factor Authentication (MFA)</span>
                <div className="w-10 h-5 bg-emerald-500 rounded-full relative cursor-pointer flex-shrink-0 ml-3">
                  <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                </div>
              </div>
              {/* SSO */}
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">SSO Integration</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-500">Select Provider</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
                <div className="bg-white divide-y divide-slate-50">
                  {['Active Directory', 'Google SSO'].map((p) => (
                    <div key={p} className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Third-parties */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-black text-slate-800 mb-4">Third-partes</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Slack */}
                <div className="flex flex-col items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-white shadow-sm border border-slate-100">
                    <span className="font-black text-purple-500">#</span>
                  </div>
                  <span className="text-xs font-black text-slate-700">Slack</span>
                  <button className="px-4 py-1.5 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-emerald-600 transition-colors w-full text-center cursor-pointer">
                    Connect
                  </button>
                </div>
                {/* Teams */}
                <div className="flex flex-col items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-white shadow-sm border border-slate-100">
                    <span className="font-black text-blue-600">T</span>
                  </div>
                  <span className="text-xs font-black text-slate-700">Teams</span>
                  <button className="px-4 py-1.5 bg-slate-600 text-white text-[10px] font-black uppercase tracking-wider rounded-lg hover:bg-slate-700 transition-colors w-full text-center cursor-pointer">
                    Configure
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Incident Config + Communication + System & Brand + Diagnostics */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-5">
            {/* 2. Incident Config */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-black text-slate-800 mb-4">2. Incident Config</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Workflows</p>
              <div className="space-y-2 mb-4">
                {['Cyberattack Workflow', 'Physical Facility Workflow'].map((w) => (
                  <div key={w} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors">
                    {w}
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Severity Levels</p>
              <div className="flex gap-1.5 mb-4 flex-wrap">
                <span className="px-2.5 py-1 bg-red-500 text-white text-[10px] font-black rounded-md">Critical</span>
                <span className="px-2.5 py-1 bg-orange-400 text-white text-[10px] font-black rounded-md">High</span>
                <span className="px-2.5 py-1 bg-yellow-400 text-slate-800 text-[10px] font-black rounded-md">Medium</span>
                <span className="px-2.5 py-1 bg-green-400 text-white text-[10px] font-black rounded-md">Low</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Checklist Editor</p>
              <div className="flex gap-2">
                {['Plan', 'Checklist'].map((c) => (
                  <span key={c} className="px-3 py-1.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors">{c}</span>
                ))}
              </div>
            </div>

            {/* 3. Communication */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-black text-slate-800 mb-4">3. Communication</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Templates</p>
              <div className="flex gap-2 mb-3">
                {['SMS', 'Email', 'In-App'].map((t) => (
                  <span key={t} className="px-3 py-1.5 bg-slate-800 text-white text-[10px] font-black rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">{t}</span>
                ))}
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-400 font-bold mb-4 italic">
                Content preview/torizes....
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Channels</p>
              <div className="flex gap-2 flex-wrap">
                {['Law Enforcement', 'Media', 'Teams'].map((c) => (
                  <span key={c} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg border border-emerald-200 cursor-pointer hover:bg-emerald-200 transition-colors">{c}</span>
                ))}
              </div>
            </div>

            {/* 5. System & Brand */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-black text-slate-800 mb-4">5. System & Brand</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Customize Logo</p>
              <div className="p-4 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center mb-4 cursor-pointer hover:bg-slate-100 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow">V</div>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Login Message</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 mt-3">Dashboard Theme</p>
              <div className="flex gap-2 mb-4">
                <button className="flex-1 py-2 bg-slate-100 border border-slate-200 text-xs font-black text-slate-600 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-1 cursor-pointer">
                  Light <ChevronDown className="w-3 h-3" />
                </button>
                <button className="flex-1 py-2 bg-slate-800 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1 cursor-pointer hover:bg-slate-700 transition-colors">
                  Dark <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">API Key</p>
                <button className="px-3 py-1.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer">Export</button>
              </div>
            </div>

            {/* 6. Diagnostics */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-black text-slate-800 mb-4">6. Diagnostics</h3>
              <div className="space-y-2.5 mb-4">
                {[
                  { label: 'System', status: 'Healtled' },
                  { label: 'Database', status: 'Healtled' },
                  { label: 'Agents', status: 'Healtled' },
                  { label: 'APIs', status: 'Healtled' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="text-[10px] font-bold text-emerald-600">{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-4 space-y-1">
                <p className="text-[10px] font-bold text-slate-600">Version: 1.2.160.3</p>
                <p className="text-[10px] font-bold text-slate-600">License Info: Infographic.</p>
              </div>
              <button className="w-full py-3 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-emerald-600 transition-colors shadow-sm shadow-emerald-100 cursor-pointer">
                Run Diagnostics
              </button>
            </div>
          </div>

          {/* Row 3: Localized Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 col-span-1">
              <h3 className="text-sm font-black text-slate-800 mb-4">5. Localized Alerts (Urdu)</h3>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-700">Enable Urdu Text-to-Speech</span>
                <div className="w-10 h-5 bg-emerald-500 rounded-full relative cursor-pointer flex-shrink-0 ml-3">
                  <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Alert Voice Model</span>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 cursor-pointer">
                  <span className="text-xs font-bold text-slate-700">Urdu</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPersonnel = () => {
    const roles = ['Team Leader', 'Medical Officer', 'Rescuer', 'Logistics Officer', 'Communication Officer', 'Driver', 'Data Analyst'];
    const teams = ['Rescue Team A', 'Rescue Team B', 'Medical Team', 'Logistics Team', 'Comms Team', 'Transport Team', 'IT Team'];
    const statuses = ['On Duty', 'Active', 'Off Duty'];
    const locations = [
      'Lahore, Punjab',
      'Islamabad',
      'Faisalabad, Punjab',
      'Karachi, Sindh',
      'Multan, Punjab',
      'Rawalpindi'
    ];

    return (
      <div className="flex-1 bg-[#f1f5f9] p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-[1600px] mx-auto space-y-8">
          
          {/* Breadcrumbs and Top Actions */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                <Grid className="w-3.5 h-3.5 text-slate-400" />
                <span className="hover:text-blue-600 cursor-pointer">Dashboard</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="hover:text-blue-600 cursor-pointer">Personnel</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-blue-600">All Personnel</span>
              </div>
              <h1 className="text-3xl font-display font-black text-slate-800 uppercase tracking-tight">Personnel</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={handleExportPersonnel}
                className="bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              
              <div className="relative">
                <button 
                  onClick={() => setShowFilterPopover(!showFilterPopover)}
                  className="bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer shadow-sm"
                >
                  <Filter className="w-4 h-4" />
                  Filter
                </button>
                
                {showFilterPopover && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-[200] space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5 mb-2">Status Filter</p>
                    {['All', 'On Duty', 'Active', 'Off Duty'].map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setPersonnelStatusFilter(status);
                          setShowFilterPopover(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold uppercase transition-colors ${
                          personnelStatusFilter === status 
                            ? 'bg-blue-50 text-blue-600' 
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => setShowAddPersonnelModal(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer shadow-md shadow-blue-500/10"
              >
                <Plus className="w-4 h-4" />
                Add Personnel
              </button>
            </div>
          </div>

          {/* 5 Card KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            
            {/* Card 1: Total Personnel */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-inner shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Total Personnel</p>
                <h3 className="text-3xl font-display font-black text-slate-800 leading-none mb-1">{personnelStats.total}</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase">All Registered</p>
              </div>
            </div>

            {/* Card 2: Active Now */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 shadow-inner shrink-0">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Active Now</p>
                <h3 className="text-3xl font-display font-black text-slate-800 leading-none mb-1">{personnelStats.active}</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase">Currently Active</p>
              </div>
            </div>

            {/* Card 3: On Duty */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner shrink-0">
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">On Duty</p>
                <h3 className="text-3xl font-display font-black text-slate-800 leading-none mb-1">{personnelStats.onDuty}</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase">On Field Duty</p>
              </div>
            </div>

            {/* Card 4: In Training */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 shadow-inner shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">In Training</p>
                <h3 className="text-3xl font-display font-black text-slate-800 leading-none mb-1">{personnelStats.training}</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase">In Training</p>
              </div>
            </div>

            {/* Card 5: Unavailable */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shadow-inner shrink-0">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Unavailable</p>
                <h3 className="text-3xl font-display font-black text-slate-800 leading-none mb-1">{personnelStats.unavailable}</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase">Not Available</p>
              </div>
            </div>

          </div>

          {/* Directory Panel */}
          <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-sm p-8 space-y-6">
            
            {/* Panel Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">All Personnel</h2>
                {personnelStatusFilter !== 'All' && (
                  <p className="text-xs text-slate-400 font-bold uppercase mt-1">Filtered by Status: {personnelStatusFilter}</p>
                )}
              </div>
              
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search personnel..."
                  value={personnelSearch}
                  onChange={(e) => setPersonnelSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 placeholder-slate-400 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Table Area */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                    <th className="py-4 px-6">ID</th>
                    <th className="py-4 px-6">Name</th>
                    <th className="py-4 px-6">Role</th>
                    <th className="py-4 px-6">Team</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6">Location</th>
                    <th className="py-4 px-6">Availability</th>
                    <th className="py-4 px-6">Last Active</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                  {filteredPersonnel.length > 0 ? (
                    filteredPersonnel.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-4 px-6 text-slate-400 font-mono">{member.id}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            {member.avatar ? (
                              <img 
                                src={member.avatar} 
                                alt={member.name}
                                className="w-10 h-10 rounded-full object-cover border border-slate-100 shadow-sm"
                                onError={(e: any) => {
                                  e.target.style.display = 'none';
                                  const parent = e.target.parentNode;
                                  if (parent) {
                                    const fallback = parent.querySelector('.initials-fallback');
                                    if (fallback) fallback.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div 
                              className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-black text-xs uppercase shadow-sm initials-fallback"
                              style={{ display: member.avatar ? 'none' : 'flex' }}
                            >
                              {member.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            <div>
                              <p className="text-slate-800 font-black text-sm">{member.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 lowercase">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-block ${getRoleBadgeClasses(member.role)}`}>
                            {member.role}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-600">{member.team}</td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              member.status === 'On Duty' || member.status === 'Active' 
                                ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' 
                                : 'bg-slate-400'
                            }`}></span>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">{member.status}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{member.location}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden shrink-0">
                              <div 
                                className="h-full bg-green-500 rounded-full" 
                                style={{ width: `${member.availability}%` }}
                              ></div>
                            </div>
                            <span className="text-[10px] font-black font-mono w-6 text-right leading-none">{member.availability}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              member.lastActiveStatus === 'active' 
                                ? 'bg-green-500' 
                                : member.lastActiveStatus === 'away' 
                                ? 'bg-amber-400' 
                                : 'bg-slate-400'
                            }`}></span>
                            <span className="text-slate-500">{member.lastActive}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex justify-center">
                            <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 px-6 text-center text-slate-400">
                        <UserX className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                        <p className="text-sm font-black uppercase tracking-wider">No Personnel Found</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">Try refining your search query or filters.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer / Pagination */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Showing 1 to {filteredPersonnel.length} of {personnelStats.total} results
              </span>
              
              <div className="flex items-center gap-1">
                <button className="px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-black uppercase tracking-wider text-slate-400 hover:bg-slate-50 disabled:opacity-50 cursor-pointer shadow-sm" disabled>
                  &lt;
                </button>
                <button className="w-9 h-9 bg-blue-600 text-white rounded-xl text-xs font-black flex items-center justify-center shadow-md shadow-blue-500/10 cursor-pointer">
                  1
                </button>
                <button className="w-9 h-9 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-black flex items-center justify-center cursor-pointer shadow-sm">
                  2
                </button>
                <button className="w-9 h-9 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-black flex items-center justify-center cursor-pointer shadow-sm">
                  3
                </button>
                <span className="px-2 text-slate-400 font-bold">...</span>
                <button className="w-9 h-9 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-black flex items-center justify-center cursor-pointer shadow-sm">
                  36
                </button>
                <button className="px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 cursor-pointer shadow-sm">
                  &gt;
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Register New Personnel Modal */}
        <AnimatePresence>
          {showAddPersonnelModal && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200"
              >
                <div className="bg-blue-600 p-8 text-white shrink-0">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-6 h-6" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">System Registry</span>
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-tight">Register New Personnel</h2>
                </div>

                <form onSubmit={handleAddPersonnelSubmit} className="p-8 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                  <div className="space-y-1.5">
                    <label htmlFor="fullname" className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Full Name</label>
                    <input
                      type="text"
                      id="fullname"
                      required
                      placeholder="e.g. Muhammad Ali"
                      value={newPersonnel.name}
                      onChange={(e) => setNewPersonnel({...newPersonnel, name: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      required
                      placeholder="e.g. ali@dms.gov"
                      value={newPersonnel.email}
                      onChange={(e) => setNewPersonnel({...newPersonnel, email: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="role" className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Role</label>
                      <select
                        id="role"
                        value={newPersonnel.role}
                        onChange={(e) => setNewPersonnel({...newPersonnel, role: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:bg-white focus:border-blue-500"
                      >
                        {roles.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="team" className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Team</label>
                      <select
                        id="team"
                        value={newPersonnel.team}
                        onChange={(e) => setNewPersonnel({...newPersonnel, team: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:bg-white focus:border-blue-500"
                      >
                        {teams.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="status" className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Status</label>
                      <select
                        id="status"
                        value={newPersonnel.status}
                        onChange={(e) => setNewPersonnel({...newPersonnel, status: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:bg-white focus:border-blue-500"
                      >
                        {statuses.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="location" className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Location (Pakistan)</label>
                      <select
                        id="location"
                        value={newPersonnel.location}
                        onChange={(e) => setNewPersonnel({...newPersonnel, location: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:bg-white focus:border-blue-500"
                      >
                        {locations.map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="photo" className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Photo (Optional)</label>
                    <input
                      type="file"
                      id="photo"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none cursor-pointer focus:bg-white focus:border-blue-500 transition-all shadow-inner"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="availability" className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Availability (%)</label>
                    <input
                      type="number"
                      id="availability"
                      min="0"
                      max="100"
                      value={newPersonnel.availability}
                      onChange={(e) => setNewPersonnel({...newPersonnel, availability: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
                    />
                  </div>

                  <div className="flex gap-4 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowAddPersonnelModal(false)}
                      className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all cursor-pointer"
                    >
                      Save Personnel
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderMaps = () => {
    // 1. Compute total reports
    const totalReports = crises.length;

    // 2. Compute reports by location (Pakistan cities)
    const reportsByLocation = (() => {
      const counts: { [key: string]: number } = {};
      crises.forEach(c => {
        let loc = 'Other Sectors';
        const locLower = (c.location || '').toLowerCase();
        if (locLower.includes('lahore')) loc = 'Lahore, Punjab';
        else if (locLower.includes('karachi')) loc = 'Karachi, Sindh';
        else if (locLower.includes('islamabad')) loc = 'Islamabad';
        else if (locLower.includes('faisalabad')) loc = 'Faisalabad, Punjab';
        else if (locLower.includes('multan')) loc = 'Multan, Punjab';
        else if (locLower.includes('rawalpindi')) loc = 'Rawalpindi';
        
        counts[loc] = (counts[loc] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    })();

    // 3. Compute critical/high reports
    const criticalReports = crises.filter(c => c.severity === 'Critical' || c.severity === 'High');
    const criticalCount = criticalReports.length;

    // 4. Compute solved reports
    const solvedReports = crises.filter(c => c.status === 'Solved' || c.status === 'Closed');
    const solvedCount = solvedReports.length;

    // 5. Time Series data
    const timeSeriesData = [
      { time: '08:00', reports: 12 + crises.length },
      { time: '10:00', reports: 24 + crises.length },
      { time: '12:00', reports: 38 + crises.length },
      { time: '14:00', reports: 28 + crises.length },
      { time: '16:00', reports: 42 + crises.length },
      { time: '18:00', reports: 56 + crises.length },
      { time: '20:00', reports: crises.length }
    ];

    const center: [number, number] = [30.3753, 69.3451];

    return (
      <div className="h-[calc(100vh-80px)] bg-slate-50 text-slate-800 flex flex-col overflow-hidden font-sans border-t border-slate-200 select-none">
        
        {/* Johns Hopkins-style Global Title Header (White Theme) */}
        <div className="bg-white px-6 py-3 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></div>
            <h2 className="text-xs font-black uppercase tracking-[0.25em] text-slate-800 font-display">
              CIRO Crisis Response — Pakistan Real-Time Incident Mapping System
            </h2>
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">
            Johns Hopkins CSSE Inspired Portal
          </span>
        </div>

        {/* 3-Column Dashboard Layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Column: Total & Location List */}
          <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
            
            {/* Total Confirmed / Total Reports Box */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/50 text-center shrink-0">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 font-sans">Total Active Reports</p>
              <h3 className="text-5xl font-mono font-black text-rose-600 tracking-tighter drop-shadow-sm animate-pulse">
                {totalReports.toLocaleString()}
              </h3>
            </div>

            {/* List by Location */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/20 shrink-0">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-sans">Active Cases by Region</span>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-50/30">
                {reportsByLocation.length > 0 ? (
                  reportsByLocation.map((loc, idx) => (
                    <div 
                      key={loc.name} 
                      className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between hover:bg-slate-50 hover:border-slate-200 transition-all duration-300 group shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-400 font-mono w-4">#{idx + 1}</span>
                        <span className="text-xs font-black text-slate-700 uppercase tracking-wider">{loc.name}</span>
                      </div>
                      <span className="text-xs font-black text-rose-600 bg-rose-50 border border-rose-100/80 px-2 py-0.5 rounded-md font-mono">
                        {loc.count}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400 text-[10px] font-black uppercase tracking-widest font-sans">
                    No active reports
                  </div>
                )}
              </div>
            </div>

            {/* Last Updated Footer */}
            <div className="p-4 border-t border-slate-200 bg-white text-center shrink-0">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-sans">Last Updated at</p>
              <p className="text-[10px] font-bold text-slate-600 font-mono mt-0.5">{new Date().toLocaleString()}</p>
            </div>

          </div>

          {/* Center Column: Full-Screen Light Leaflet Map */}
          <div className="flex-1 h-full bg-slate-100 relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 z-0">
              <MapContainer
                center={center}
                zoom={6}
                scrollWheelZoom={true}
                className="h-full w-full"
                zoomControl={false}
              >
                {/* CartoDB Light base tile layer */}
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/attributions">CartoDB</a>'
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />

                {/* Render live incident markers proportional to severity/confidence */}
                {crises.map((crisis) => {
                  const lat = parseFloat(crisis.lat || crisis.coordinates?.[0]);
                  const lng = parseFloat(crisis.lng || crisis.coordinates?.[1]);
                  
                  if (isNaN(lat) || isNaN(lng)) return null;

                  const isCritical = crisis.severity === 'Critical' || crisis.severity === 'High';
                  const radius = isCritical ? 14 : 8;
                  const color = isCritical ? '#f43f5e' : '#d97706';
                  const fillOpacity = isCritical ? 0.25 : 0.2;

                  return (
                    <CircleMarker
                      key={crisis.id}
                      center={[lat, lng]}
                      radius={radius}
                      pathOptions={{
                        color: color,
                        fillColor: color,
                        fillOpacity: fillOpacity,
                        weight: 2
                      }}
                    >
                      <Popup>
                        <div className="p-3 bg-white text-slate-800 rounded-xl font-sans min-w-[200px]">
                          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-1.5 mb-2">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                              isCritical ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                            }`}>
                              {crisis.type}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 font-mono">#{crisis.id}</span>
                          </div>
                          
                          <p className="text-xs font-bold text-slate-600 leading-snug mb-2">{crisis.details || 'No details provided.'}</p>
                          
                          <div className="flex items-center gap-1 text-[9px] font-black text-slate-500 uppercase tracking-wider">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{crisis.location}</span>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-2">
                            <span className="text-[9px] font-bold text-slate-400">Confidence:</span>
                            <span className="text-[10px] font-black font-mono text-emerald-600">
                              {Math.round((crisis.confidenceScore || 0.8) * 100)}%
                            </span>
                          </div>
                        </div>
                      </Popup>
                      <LeafletTooltip sticky className="bg-white border border-slate-200 text-slate-800 text-[10px] font-black uppercase rounded-lg shadow-md">
                        {crisis.type} - {crisis.location}
                      </LeafletTooltip>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>

            {/* Custom Floating Zoom Controls */}
            <div className="absolute bottom-5 right-5 z-[1000] flex flex-col gap-1 shadow-md rounded-xl overflow-hidden border border-slate-200 bg-white">
              <button 
                onClick={() => {
                  const mapEl = document.querySelector('.leaflet-container') as any;
                  if (mapEl && mapEl._leaflet_map) mapEl._leaflet_map.zoomIn();
                }}
                className="w-10 h-10 bg-white text-slate-600 hover:bg-slate-50 active:scale-95 transition-all font-black text-lg flex items-center justify-center border-b border-slate-200 cursor-pointer"
              >
                +
              </button>
              <button 
                onClick={() => {
                  const mapEl = document.querySelector('.leaflet-container') as any;
                  if (mapEl && mapEl._leaflet_map) mapEl._leaflet_map.zoomOut();
                }}
                className="w-10 h-10 bg-white text-slate-600 hover:bg-slate-50 active:scale-95 transition-all font-black text-lg flex items-center justify-center cursor-pointer"
              >
                -
              </button>
            </div>

            {/* Legend Overlay (White Theme) */}
            <div className="absolute top-5 left-5 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200 p-4 rounded-2xl shadow-lg space-y-2.5 max-w-[200px]">
              <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-1.5 font-sans">Map Legend</h4>
              <div className="space-y-2 font-sans">
                <div className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full bg-rose-500/20 border border-rose-500 animate-pulse shrink-0"></span>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Critical Threat</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500 shrink-0"></span>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">High Warning</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500 shrink-0"></span>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Safe / Monitored</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Severity Lists & Trend Chart */}
          <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden">
            
            {/* Top Row: Critical Reports & Solved Reports Splits */}
            <div className="grid grid-cols-2 border-b border-slate-200 shrink-0">
              
              {/* Critical Reports Card */}
              <div className="p-4 border-r border-slate-200 bg-slate-50/50 flex flex-col items-center">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center font-sans">Critical cases</span>
                <span className="text-3xl font-mono font-black text-rose-500 mt-1">{criticalCount}</span>
              </div>

              {/* Solved Reports Card */}
              <div className="p-4 bg-slate-50/50 flex flex-col items-center">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center font-sans">Solved cases</span>
                <span className="text-3xl font-mono font-black text-emerald-600 mt-1">{solvedCount}</span>
              </div>

            </div>

            {/* Split Scrolling Lists for Critical and Solved reports */}
            <div className="flex-1 grid grid-rows-2 overflow-hidden bg-slate-50/30">
              
              {/* Critical Severity Scroll list */}
              <div className="flex flex-col border-b border-slate-200 overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-200 bg-slate-50/40 shrink-0">
                  <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest font-sans">Active Critical Incidents</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5 bg-slate-50/10">
                  {criticalReports.length > 0 ? (
                    criticalReports.map(c => (
                      <div key={c.id} className="p-2.5 bg-white border border-slate-100 rounded-lg flex items-center justify-between shadow-sm hover:border-slate-200 hover:bg-slate-50/40 transition-all duration-300">
                        <div className="space-y-0.5 truncate pr-2">
                          <p className="text-[10px] font-black text-slate-800 uppercase tracking-wider truncate font-sans">{c.type}</p>
                          <p className="text-[9px] font-bold text-slate-400 truncate leading-none font-sans">{c.location}</p>
                        </div>
                        <span className="text-[9px] font-black font-mono text-rose-500 shrink-0 uppercase bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">
                          {c.severity}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-[9px] font-black uppercase tracking-widest font-sans">
                      No critical threats
                    </div>
                  )}
                </div>
              </div>

              {/* Solved Severity Scroll list */}
              <div className="flex flex-col overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-200 bg-slate-50/40 shrink-0">
                  <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest font-sans">Solved/Closed Incidents</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5 bg-slate-50/10">
                  {solvedReports.length > 0 ? (
                    solvedReports.map(c => (
                      <div key={c.id} className="p-2.5 bg-white border border-slate-100 rounded-lg flex items-center justify-between shadow-sm hover:border-slate-200 hover:bg-slate-50/40 transition-all duration-300">
                        <div className="space-y-0.5 truncate pr-2">
                          <p className="text-[10px] font-black text-slate-800 uppercase tracking-wider truncate font-sans">{c.type}</p>
                          <p className="text-[9px] font-bold text-slate-400 truncate leading-none font-sans">{c.location}</p>
                        </div>
                        <span className="text-[9px] font-black font-mono text-emerald-600 shrink-0 uppercase bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                          Closed
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-[9px] font-black uppercase tracking-widest font-sans">
                      No solved records
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Time Series Recharts Area Chart */}
            <div className="p-4 border-t border-slate-200 bg-white shrink-0 h-44 flex flex-col justify-between">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 font-sans">
                Incident Trend (24h)
              </span>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData} margin={{ top: 2, right: 2, left: -25, bottom: 2 }}>
                    <defs>
                      <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={8} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '10px' }}
                      itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="reports" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorReports)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

        </div>

      </div>
    );
  };

  const renderCurrentView = () => {
    switch (activeTab) {
      case 'Dashboard':
        return renderDashboard();
      case 'Operations':
        return renderOperations();
      case 'Maps':
        return renderMaps();
      case 'Reports':
        return renderReports();
      case 'Analytics':
        return renderAnalytics();
      case 'Settings':
        return renderSettings();
      case 'Personnel':
        return renderPersonnel();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="h-screen bg-[#f1f5f9] flex flex-col overflow-hidden font-sans">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .animate-progress-fast { animation: progress-fast 2s linear infinite; }
        @keyframes progress-fast { 0% { width: 0%; } 100% { width: 100%; } }
        
        /* Leaflet Light Theme popups matching white theme dashboard */
        .leaflet-popup-content-wrapper {
          background: #ffffff !important;
          color: #1e293b !important;
          border-radius: 16px !important;
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08) !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          padding: 0 !important;
        }
        .leaflet-popup-tip {
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
        }
      `}</style>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Navigation */}
        <aside className="w-[240px] bg-[#f8fafc] border-r border-slate-200 flex flex-col z-[1000] shrink-0">
          {/* Logo Section */}
          <div className="p-6 border-b border-slate-200 flex items-center gap-3 bg-white">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">
              V
            </div>
            <span className="text-lg font-black text-slate-800 tracking-wider">VANGUARD</span>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto custom-scrollbar">
            {navLinks.map((link) => {
              const isActive = activeTab === link.name;
              return (
                <button
                  key={link.name}
                  onClick={() => setActiveTab(link.name)}
                  className={`w-full px-4 py-3.5 rounded-xl flex items-center gap-3.5 transition-all font-bold text-xs uppercase tracking-wider cursor-pointer ${
                    isActive
                      ? 'bg-[#e1eaf5] text-blue-600 font-black shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`}
                >
                  <span className={isActive ? 'text-blue-600' : 'text-slate-500'}>{link.icon}</span>
                  <span className="truncate">{link.name}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Content Area with Top Header */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-[#f1f5f9]">
          {/* Top Header */}
          <header className="h-20 bg-[#f8fafc] border-b border-slate-200 px-8 flex items-center justify-between shrink-0 z-[500] shadow-sm">
            <div className="flex items-center gap-4">
              <h1 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                VANGUARD CIRO ADMIN PANEL | GLOBAL DASHBOARD | {currentDateTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}
              </h1>
            </div>

            <div className="flex items-center gap-6">
              {activeTab === 'Operations' && (
                <div
                  onClick={handleRealtimeTwitterSync}
                  className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50 transition-colors active:scale-95"
                >
                  <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" style={{ animationDuration: '4s' }} />
                  <span className="text-xs font-bold text-slate-700">Real-time Sync</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              )}

              <div className="flex flex-col items-end border-l border-slate-200 pl-6">
                <span className="text-xs font-black text-slate-800 font-mono">Live Feed</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {currentDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {currentDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              <div className="flex items-center gap-3 border-l border-slate-200 pl-6 cursor-pointer group">
                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 group-hover:bg-slate-200 transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">
                  Admin: Vanguard OPS
                </span>
              </div>
            </div>
          </header>

          {/* Current View Content */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {renderCurrentView()}
          </div>
        </main>
      </div>

      {/* Critical Toast Overlay */}
      <AnimatePresence>
        {activeToast && (
          <motion.div
            initial={{ opacity: 0, x: 100, y: 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-24 right-8 z-[2000] w-[400px]"
          >
            <div className={`p-6 rounded-[2rem] shadow-2xl border-2 bg-white flex items-start gap-4 ${
              activeToast.severity === 'CRITICAL' ? 'border-red-500 bg-red-50/50 shadow-red-200' : 'border-orange-400 bg-orange-50/50 shadow-orange-200'
            }`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                activeToast.severity === 'CRITICAL' ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'
              }`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`text-sm font-black uppercase tracking-tight ${
                    activeToast.severity === 'CRITICAL' ? 'text-red-900' : 'text-orange-900'
                  }`}>{activeToast.title}</h4>
                  <button onClick={() => setActiveToast(null)} className="text-slate-400 hover:text-slate-600">
                    <Cross className="w-4 h-4 rotate-45" />
                  </button>
                </div>
                <p className="text-xs font-bold text-slate-800 leading-relaxed mb-3">{activeToast.message}</p>
                <div className="flex gap-2">
                  <button className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white transition-all ${
                    activeToast.severity === 'CRITICAL' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'
                  }`}>Dispatch Team</button>
                  <button className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">Dismiss</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
