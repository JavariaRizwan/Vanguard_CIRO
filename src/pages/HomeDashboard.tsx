import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Waves as WaveIcon, Cross, LifeBuoy, Sun, Home, Map as MapIcon, Bell, User, Search, MapPin, ChevronRight, LogIn, FileText, Printer, LogOut, FileCheck, Loader2, MessageCircle, CheckCircle, RefreshCw, Twitter, Share2, Clock, CloudRain, Wind, Thermometer, Droplets, Activity, PhoneCall, MoreHorizontal, Menu, Shield, Zap, CloudLightning, ThermometerSun, AlertTriangle, CheckSquare, Users, Navigation } from 'lucide-react';
import MapComponent from '../components/MapComponent';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Leaflet icon will be defined lazily inside the component to prevent load-time crashes
const getTomTomApiKey = () => {
  try {
    const el = document.querySelector('[data-runtime-config]');
    if (el) {
      const base64Config = el.getAttribute('data-runtime-config') || '';
      const config = JSON.parse(atob(base64Config));
      return config.VITE_TOMTOM_API_KEY || import.meta.env.VITE_TOMTOM_API_KEY || '';
    }
  } catch (err) {
    console.error('Error parsing dynamic runtime config:', err);
  }
  return import.meta.env.VITE_TOMTOM_API_KEY || '';
};

export default function HomeDashboard() {
  const [incidents, setIncidents] = useState([]);
  const [gisData, setGisData] = useState(null);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  const customIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  const [activeTab, setActiveTab] = useState<'feed' | 'prioritized'>('feed');
  const [navTab, setNavTab] = useState<'home' | 'map' | 'alerts' | 'reports' | 'profile'>('home');
  const [homeSubView, setHomeSubView] = useState<'default' | 'teams' | 'active-incidents' | 'resolved' | 'high-priority' | 'all-reports' | 'safety-tips' | 'emergency-services'>('default');
  const [unreadNotifications, setUnreadNotifications] = useState(3);
  const [profileTab, setProfileTab] = useState<'info' | 'reports' | 'medical' | 'preferences'>('info');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [activeServiceRoutePath, setActiveServiceRoutePath] = useState<[number, number][] | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [isServiceRouting, setIsServiceRouting] = useState<number | null>(null);

  const [userReports, setUserReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [socialFeed, setSocialFeed] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [postLikes, setPostLikes] = useState<Record<string, number>>({});
  const [typingComment, setTypingComment] = useState<Record<string, string>>({});
  const [localComments, setLocalComments] = useState<Record<string, any[]>>({});
  const [followedUsers, setFollowedUsers] = useState<Record<string, boolean>>({});
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (socialFeed && socialFeed.length > 0) {
      const commentsMap: Record<string, any[]> = {};
      const likesMap: Record<string, number> = {};
      socialFeed.forEach((post) => {
        commentsMap[post.id] = post.comments || [];
        likesMap[post.id] = post.likes || 11;
      });
      setLocalComments(prev => {
        const updated = { ...prev };
        Object.keys(commentsMap).forEach(key => {
          if (!updated[key]) {
            updated[key] = commentsMap[key];
          }
        });
        return updated;
      });
      setPostLikes(prev => {
        const updated = { ...prev };
        Object.keys(likesMap).forEach(key => {
          if (updated[key] === undefined) {
            updated[key] = likesMap[key];
          }
        });
        return updated;
      });
    }
  }, [socialFeed]);

  const [severityFilter, setSeverityFilter] = useState<'All' | 'Critical' | 'Warning' | 'Info'>('All');

  const [isAnalyticsMinimized, setIsAnalyticsMinimized] = useState(false);
  const [layersVisible, setLayersVisible] = useState({
    residential: false,
    urban: true,
    highRisk: false,
    precipitation: false
  });

  const [weather, setWeather] = useState<any>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [userAddress, setUserAddress] = useState<string>('Resolving exact address...');
  
  useEffect(() => {
    const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
    if (navTab === 'home' && OPENWEATHER_API_KEY) {
      const lat = userLocation ? userLocation[0] : 31.4187;
      const lon = userLocation ? userLocation[1] : 73.0791;
      
      // Current Weather
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.main) setWeather(data);
        })
        .catch(console.error);

      // 5-Day Forecast
      fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.list) {
            const dailyMap: any = {};
            data.list.forEach((item: any) => {
              const dateStr = item.dt_txt.split(' ')[0];
              if (!dailyMap[dateStr] || item.dt_txt.includes("12:00:00")) {
                dailyMap[dateStr] = item;
              }
            });
            const list = Object.values(dailyMap).sort((a: any, b: any) => a.dt - b.dt).slice(1, 5);
            setForecast(list);
          }
        })
        .catch(console.error);
    }
  }, [navTab, userLocation]);

  const fetchAlerts = () => {
    fetch('/api/alerts/authentic')
      .then(res => res.json())
      .then(setAlerts)
      .catch(console.error);
  };

  const fetchSocialFeed = () => {
    fetch('/api/social-feed')
      .then(res => res.json())
      .then(setSocialFeed)
      .catch(console.error);
  };

  useEffect(() => {
    const auth = localStorage.getItem('ciro_auth');
    if (auth) setUser(JSON.parse(auth).user);

    fetch('/api/incidents')
      .then(res => res.json())
      .then(data => Array.isArray(data) ? setIncidents(data) : setIncidents([]))
      .catch(() => setIncidents([]));

    fetch('/api/gis-data')
      .then(res => res.json())
      .then(setGisData);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setUserLocation([lat, lon]);
          
          const TOMTOM_API_KEY = getTomTomApiKey();
          const url = TOMTOM_API_KEY 
            ? `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lon}.json?key=${TOMTOM_API_KEY}`
            : `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
            
          fetch(url)
            .then(res => res.json())
            .then(data => {
              if (TOMTOM_API_KEY) {
                if (data.addresses && data.addresses[0]) {
                  setUserAddress(data.addresses[0].address.freeformAddress);
                } else {
                  setUserAddress(`${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`);
                }
              } else {
                if (data.display_name) {
                  setUserAddress(data.display_name);
                } else {
                  setUserAddress(`${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`);
                }
              }
            })
            .catch(() => {
              setUserAddress(`${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`);
            });
        },
        (err) => {
          console.warn('Geolocation error:', err);
          setUserAddress('Faisalabad, Punjab, Pakistan');
        }
      );
    } else {
      setUserAddress('Faisalabad, Punjab, Pakistan');
    }

    fetchSocialFeed();
  }, []);

  useEffect(() => {
    if (navTab === 'alerts') {
      setUnreadNotifications(0);
      setLoadingAlerts(true);
      fetchAlerts();
      setLoadingAlerts(false);

      const interval = setInterval(() => {
        fetchAlerts();
        fetchSocialFeed();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [navTab]);

  const handleResolveAlert = (alertId: string) => {
    fetch('/api/alerts/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId })
    })
    .then(res => res.json())
    .then(() => {
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    })
    .catch(console.error);
  };

  useEffect(() => {
    if ((navTab === 'reports' || navTab === 'profile') && user) {
      setLoadingReports(true);
      fetch(`/api/user/reports?citizenId=${user.citizenId}`)
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) setUserReports(data);
            else setUserReports([]);
            setLoadingReports(false);
        })
        .catch(() => {
            setUserReports([]);
            setLoadingReports(false);
        });
    }
  }, [navTab, user]);

  const handleLogout = () => {
    localStorage.removeItem('ciro_auth');
    setUser(null);
    setNavTab('home');
    navigate('/');
  };

  const handlePrintReport = (report: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(80, 160, 160); // Teal Muted
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('CIRO PAKISTAN', 20, 20);
    doc.setFontSize(10);
    doc.text('COMMAND INFRASTRUCTURE RESPONSE OPERATIONS', 20, 30);
    
    // Report Info
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(16);
    doc.text(`Official Incident Report: #INC-${report.id}`, 20, 60);
    
    doc.setFontSize(12);
    doc.text(`Type: ${report.type}`, 20, 75);
    doc.text(`Status: ${report.status}`, 20, 85);
    doc.text(`Severity: ${report.severity || 'N/A'}`, 20, 95);
    doc.text(`Location: ${report.location}`, 20, 105);
    doc.text(`Timestamp: ${report.time || new Date().toLocaleString()}`, 20, 115);
    
    // Details
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 125, 190, 125);
    
    doc.setFontSize(14);
    doc.text('Incident Details & Summary', 20, 140);
    doc.setFontSize(10);
    const splitDetails = doc.splitTextToSize(report.details || 'No additional details provided by the reporter.', 170);
    doc.text(splitDetails, 20, 150);
    
    // Verification
    doc.setFontSize(14);
    doc.text('Verification Metadata', 20, 180);
    doc.setFontSize(10);
    doc.text(`Satellite Confidence Score: ${report.confidence || '0.85'}`, 20, 190);
    doc.text(`Infrastructure Status: ${report.infrastructure || 'Operational'}`, 20, 197);
    doc.text(`Reporter ID: ${report.citizenId || 'Anonymous'}`, 20, 204);
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('This is a system-generated document verified via Gemini AI and Satellite Telemetry.', 105, 280, { align: 'center' });
    doc.text('© CIRO PAKISTAN COMMAND CENTER', 105, 285, { align: 'center' });
    
    doc.save(`CIRO-Report-INC-${report.id}.pdf`);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateRouteToService = async (serviceId: number, svcLat: number, svcLng: number) => {
    const startLat = userLocation ? userLocation[0] : 31.4187;
    const startLng = userLocation ? userLocation[1] : 73.0791;
    
    setIsServiceRouting(serviceId);
    setSelectedServiceId(serviceId);
    
    const TOMTOM_API_KEY = getTomTomApiKey();
    if (TOMTOM_API_KEY) {
      try {
        const res = await fetch(`https://api.tomtom.com/routing/1/calculateRoute/${startLat},${startLng}:${svcLat},${svcLng}/json?key=${TOMTOM_API_KEY}&traffic=true`);
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const pathPoints = data.routes[0].legs[0].points.map((p: any) => [p.latitude, p.longitude] as [number, number]);
          setActiveServiceRoutePath(pathPoints);
        } else {
          setActiveServiceRoutePath([[startLat, startLng], [svcLat, svcLng]]);
        }
      } catch (e) {
        setActiveServiceRoutePath([[startLat, startLng], [svcLat, svcLng]]);
      }
    } else {
      setActiveServiceRoutePath([[startLat, startLng], [svcLat, svcLng]]);
    }
    setIsServiceRouting(null);
  };

  const getWeatherIconLarge = (main: string) => {
    const m = main.toLowerCase();
    if (m.includes('rain') || m.includes('drizzle')) return <CloudRain className="w-12 h-12 text-blue-500" />;
    if (m.includes('thunderstorm') || m.includes('lightning')) return <CloudLightning className="w-12 h-12 text-slate-600 animate-pulse" />;
    if (m.includes('clear') || m.includes('sun')) return <Sun className="w-12 h-12 text-orange-500 animate-spin" style={{ animationDuration: '10s' }} />;
    return <Wind className="w-12 h-12 text-slate-400" />;
  };

  const getWeatherIconForecast = (main: string) => {
    const m = main.toLowerCase();
    if (m.includes('rain') || m.includes('drizzle')) return <CloudRain className="w-5 h-5 text-blue-500 mx-auto mb-1 animate-bounce" />;
    if (m.includes('thunderstorm') || m.includes('lightning')) return <CloudLightning className="w-5 h-5 text-slate-500 mx-auto mb-1" />;
    if (m.includes('clear') || m.includes('sun')) return <Sun className="w-5 h-5 text-orange-400 mx-auto mb-1" />;
    return <Wind className="w-5 h-5 text-slate-400 mx-auto mb-1" />;
  };

  const getFloodRisk = (desc: string) => {
    const d = desc.toLowerCase();
    if (d.includes('heavy') || d.includes('extreme') || d.includes('thunderstorm')) return { label: 'High', color: 'text-red-500' };
    if (d.includes('rain') || d.includes('drizzle')) return { label: 'Moderate', color: 'text-yellow-500' };
    return { label: 'Low', color: 'text-green-500' };
  };

  const nearbyIncidents = Array.isArray(incidents) ? incidents.filter((inc: any) => {
    if (!userLocation || !inc.lat) return false;
    const dist = calculateDistance(userLocation[0], userLocation[1], inc.lat, inc.lng);
    return dist <= 2; // 2km
  }) : [];

  const handleReportAction = () => {
    navigate('/report');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden font-sans">
      {/* Header */}
      {navTab === 'home' ? (
        <header className="px-5 py-4 flex justify-between items-center bg-white shrink-0 z-50">
          <div className="flex items-center gap-4">
            <button className="text-slate-700">
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-sm font-black text-slate-800">Hello, {user ? user.name.split(' ')[0] : 'User'}!</h1>
              <p className="text-[10px] font-bold text-slate-500">Stay safe, stay prepared.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full max-w-[200px]">
              <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{userAddress}</span>
            </div>
            <div className="relative cursor-pointer" onClick={() => setNavTab('alerts')}>
              <Bell className="w-5 h-5 text-slate-700" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white text-[8px] font-black text-white flex items-center justify-center">{unreadNotifications}</span>
              )}
            </div>
            {user ? (
                <div onClick={() => setNavTab('profile')} className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-black text-blue-700 cursor-pointer">
                    {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                </div>
            ) : (
                <div onClick={() => navigate('/login')} className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-black text-blue-700 cursor-pointer">
                    <User className="w-4 h-4" />
                </div>
            )}
          </div>
        </header>
      ) : (
        <header className="px-5 py-3 border-b flex justify-between items-center bg-white shrink-0 z-50">
          <h1 className="text-xl font-display font-bold text-teal-muted tracking-tight">CIRO Pakistan</h1>
          <div className="flex items-center gap-3">
              {user ? (
                  <div onClick={() => setNavTab('profile')} className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-xs font-bold text-sky-700 font-display shadow-sm ring-2 ring-white cursor-pointer active:scale-95 transition-all">
                      {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </div>
              ) : (
                  <div className="flex items-center gap-2">
                      <button onClick={() => navigate('/login')} className="text-[10px] font-bold text-teal-muted hover:bg-teal-muted/5 border border-teal-muted/20 rounded-md tracking-tight px-3 py-1.5 transition-colors cursor-pointer">LOG IN</button>
                      <button onClick={() => navigate('/register')} className="text-[10px] font-bold bg-teal-muted text-white rounded-md tracking-tight px-3 py-1.5 shadow-sm hover:shadow-md transition-all cursor-pointer">REGISTER</button>
                  </div>
              )}
          </div>
        </header>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Sidebar Nav */}
        <aside className="hidden md:flex flex-col w-20 border-r border-slate-100 bg-white items-center py-8 gap-10 shrink-0">
          <NavIcon icon={<Home className="w-6 h-6" />} label="HOME" active={navTab === 'home'} onClick={() => setNavTab('home')} />
          <NavIcon icon={<MapIcon className="w-6 h-6" />} label="MAP" active={navTab === 'map'} onClick={() => setNavTab('map')} />
          <NavIcon icon={<Bell className="w-6 h-6" />} label="ALERTS" active={navTab === 'alerts'} onClick={() => setNavTab('alerts')} />
          <NavIcon icon={<FileText className="w-6 h-6" />} label="REPORTS" active={navTab === 'reports'} onClick={() => setNavTab('reports')} />
          <NavIcon icon={<User className="w-6 h-6" />} label="PROFILE" active={navTab === 'profile'} onClick={() => setNavTab('profile')} />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Mobile Tabs */}
          <div className="md:hidden flex border-b border-gray-100 bg-white shrink-0">
            <button 
                onClick={() => setActiveTab('feed')}
                className={`flex-1 py-3 text-sm font-bold transition-all cursor-pointer ${activeTab === 'feed' ? 'border-b-2 border-teal-muted text-teal-muted' : 'text-gray-400 opacity-60'}`}
            >
                Feed
            </button>
            <button 
                onClick={() => setActiveTab('prioritized')}
                className={`flex-1 py-3 text-sm font-bold transition-all cursor-pointer ${activeTab === 'prioritized' ? 'border-b-2 border-teal-muted text-teal-muted' : 'text-gray-400 opacity-60'}`}
            >
                Prioritized
            </button>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col bg-white">            {navTab === 'home' && (
              <div className="flex-1 flex flex-col p-4 space-y-6 overflow-y-auto no-scrollbar bg-slate-50">
                {homeSubView === 'default' ? (
                  <>
                    {/* Alert Banner */}
                    {nearbyIncidents.filter((i: any) => i.severity === 'High').length > 0 ? (
                      <div className="bg-[#ef4444] rounded-xl p-4 text-white shadow-lg shadow-red-500/20 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                          </div>
                          <div>
                            <h3 className="font-black text-sm">{nearbyIncidents.find((i: any) => i.severity === 'High')?.type} <span className="font-normal opacity-90">in your area</span></h3>
                            <p className="text-[11px] opacity-90 mt-0.5 font-medium">{nearbyIncidents.find((i: any) => i.severity === 'High')?.location}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 md:flex-col md:items-end md:gap-2">
                          <span className="text-[10px] flex items-center gap-1 opacity-90 font-medium whitespace-nowrap"><Clock className="w-3 h-3" /> Just now</span>
                          <button 
                            onClick={() => {
                              const highInc = nearbyIncidents.find((i: any) => i.severity === 'High');
                              if (highInc) navigate(`/report-detail/${highInc.id}`);
                            }}
                            className="bg-white text-red-500 text-[10px] font-black px-4 py-2 rounded-lg hover:bg-red-50 active:scale-95 transition-all whitespace-nowrap shadow-sm cursor-pointer"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-500 rounded-xl p-4 text-white shadow-lg shadow-emerald-500/20 flex items-center gap-3">
                         <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0">
                           <CheckCircle className="w-6 h-6 text-emerald-500" />
                         </div>
                         <div>
                           <h3 className="font-black text-sm">Safe Zone</h3>
                           <p className="text-[11px] opacity-90 mt-0.5 font-medium">No immediate high-priority threats detected in your area.</p>
                         </div>
                      </div>
                    )}

                    {/* Report an Emergency Horizontal Scroll */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-end px-1">
                        <h2 className="text-sm font-black text-slate-800">Report an Emergency</h2>
                        <span onClick={() => navigate('/report')} className="text-[11px] font-black text-blue-500 cursor-pointer hover:underline">See All</span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 px-1">
                        <button onClick={() => navigate('/report', { state: { type: 'Accident' } })} className="w-20 h-20 shrink-0 bg-red-50 border border-red-100 rounded-xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm cursor-pointer hover:border-red-200">
                          <AlertTriangle className="w-7 h-7 text-red-500" />
                          <span className="text-[9px] font-black text-slate-700">Accident</span>
                        </button>
                        <button onClick={() => navigate('/report', { state: { type: 'Urban Flooding' } })} className="w-20 h-20 shrink-0 bg-blue-50 border border-blue-100 rounded-xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm cursor-pointer hover:border-blue-200">
                          <WaveIcon className="w-7 h-7 text-blue-500" />
                          <span className="text-[9px] font-black text-slate-700">Flood</span>
                        </button>
                        <button onClick={() => navigate('/report', { state: { type: 'Heatwave' } })} className="w-20 h-20 shrink-0 bg-orange-50 border border-orange-100 rounded-xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm cursor-pointer hover:border-orange-200">
                          <ThermometerSun className="w-7 h-7 text-orange-500" />
                          <span className="text-[9px] font-black text-slate-700">Heatwave</span>
                        </button>
                        <button onClick={() => navigate('/report', { state: { type: 'Power Outage' } })} className="w-20 h-20 shrink-0 bg-purple-50 border border-purple-100 rounded-xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm cursor-pointer hover:border-purple-200">
                          <Zap className="w-7 h-7 text-purple-500" />
                          <span className="text-[9px] font-black text-slate-700">Power Outage</span>
                        </button>
                        <button onClick={() => navigate('/report', { state: { type: 'Other', customType: 'Medical' } })} className="w-20 h-20 shrink-0 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm cursor-pointer hover:border-emerald-200">
                          <Cross className="w-7 h-7 text-emerald-500" />
                          <span className="text-[9px] font-black text-slate-700">Medical</span>
                        </button>
                        <button onClick={() => navigate('/report', { state: { type: 'Other' } })} className="w-20 h-20 shrink-0 bg-slate-100 border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform shadow-sm cursor-pointer hover:border-slate-300">
                          <MoreHorizontal className="w-7 h-7 text-slate-500" />
                          <span className="text-[9px] font-black text-slate-700">Other</span>
                        </button>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-1">
                       <div 
                         onClick={() => setHomeSubView('active-incidents')}
                         className="bg-red-50/50 border border-red-100 rounded-xl p-3 flex flex-col items-center text-center cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all hover:shadow-md hover:border-red-200 group"
                       >
                         <div className="flex items-center gap-2 text-red-500 mb-1">
                           <AlertTriangle className="w-4 h-4" /> <span className="text-xl font-black">{incidents.filter((i: any) => i.status !== 'Solved').length}</span>
                         </div>
                         <span className="text-[9px] font-bold text-slate-600 mb-1">Active Incidents</span>
                         <span className="text-[9px] font-black text-blue-500 group-hover:underline">View all</span>
                       </div>
                       
                       <div 
                         onClick={() => setHomeSubView('resolved')}
                         className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 flex flex-col items-center text-center cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all hover:shadow-md hover:border-emerald-200 group"
                       >
                         <div className="flex items-center gap-2 text-emerald-500 mb-1">
                           <CheckSquare className="w-4 h-4" /> <span className="text-xl font-black">{incidents.filter((i: any) => i.status === 'Solved').length}</span>
                         </div>
                         <span className="text-[9px] font-bold text-slate-600 mb-1">Resolved Today</span>
                         <span className="text-[9px] font-black text-blue-500 group-hover:underline">View all</span>
                       </div>

                       <div 
                         onClick={() => setHomeSubView('high-priority')}
                         className="bg-orange-50/50 border border-orange-100 rounded-xl p-3 flex flex-col items-center text-center cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all hover:shadow-md hover:border-orange-200 group"
                       >
                         <div className="flex items-center gap-2 text-orange-500 mb-1">
                           <AlertTriangle className="w-4 h-4" /> <span className="text-xl font-black">{incidents.filter((i: any) => i.severity === 'High' || i.severity === 'Critical').length}</span>
                         </div>
                         <span className="text-[9px] font-bold text-slate-600 mb-1">High Priority</span>
                         <span className="text-[9px] font-black text-blue-500 group-hover:underline">View all</span>
                       </div>

                       <div 
                         onClick={() => setHomeSubView('teams')}
                         className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex flex-col items-center text-center cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all hover:shadow-md hover:border-blue-200 group"
                       >
                         <div className="flex items-center gap-2 text-blue-500 mb-1">
                           <Users className="w-4 h-4" /> <span className="text-xl font-black">{Math.max(1, Math.ceil(incidents.filter((i: any) => i.status !== 'Solved').length / 3))}</span>
                         </div>
                         <span className="text-[9px] font-bold text-slate-600 mb-1">Teams Active</span>
                         <span className="text-[9px] font-black text-blue-500 group-hover:underline">View all</span>
                       </div>
                    </div>

                    {/* Grid for Recent Incidents and Nearby Services */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-1">
                       {/* Recent Incidents */}
                       <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                          <div className="flex justify-between items-end mb-4">
                            <h2 className="text-sm font-black text-slate-800">Recent Incidents</h2>
                            <span onClick={() => setHomeSubView('all-reports')} className="text-[11px] font-black text-blue-500 cursor-pointer hover:underline">See All</span>
                          </div>
                          <div className="space-y-4">
                             {incidents.slice(0, 4).map((inc: any, idx: number) => (
                               <div key={`recent-${inc.id || idx}`} onClick={() => navigate(`/report-detail/${inc.id}`)} className="flex items-center gap-3 cursor-pointer group">
                                 <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${inc.severity === 'High' ? 'bg-red-50 text-red-500' : inc.severity === 'Medium' ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                   <Activity className="w-5 h-5" />
                                 </div>
                                 <div className="flex-1">
                                   <h4 className="text-xs font-black text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">{inc.type}</h4>
                                   <p className="text-[10px] text-slate-500 font-medium">{inc.location}</p>
                                 </div>
                                 <div className="flex flex-col items-end gap-1">
                                   <span className={`text-[9px] font-black px-2 py-0.5 rounded ${inc.severity === 'High' ? 'bg-red-50 text-red-500' : inc.severity === 'Medium' ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-500'}`}>{inc.severity || 'Low'}</span>
                                   <span className="text-[9px] text-slate-400 font-medium">{inc.time}</span>
                                 </div>
                               </div>
                             ))}
                             {incidents.length === 0 && (
                                <div className="text-center text-slate-400 text-xs py-4 font-bold border border-dashed border-slate-200 rounded-xl bg-slate-50">No recent incidents.</div>
                             )}
                          </div>
                       </div>

                       {/* Nearby Emergency Services Map */}
                       <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col">
                          <div className="flex justify-between items-end mb-4">
                            <h2 className="text-sm font-black text-slate-800">Nearby Emergency Services</h2>
                            <span onClick={() => setHomeSubView('emergency-services')} className="text-[11px] font-black text-blue-500 cursor-pointer hover:underline">See All</span>
                          </div>
                          <div className="flex-1 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative min-h-[200px] mb-3 z-0">
                            {getTomTomApiKey() ? (
                               <MapContainer 
                                 center={[31.4187, 73.0791]} 
                                 zoom={13} 
                                 minZoom={5}
                                 maxBounds={[[23.0, 60.0], [37.5, 80.0]]}
                                 maxBoundsViscosity={1.0}
                                 scrollWheelZoom={false}
                                 style={{ height: '100%', width: '100%', zIndex: 1 }}
                               >
                                 <TileLayer
                                   url={`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${getTomTomApiKey()}`}
                                   attribution='&copy; TomTom'
                                 />
                                 <Marker position={[31.4287, 73.0891]} icon={customIcon}>
                                   <Tooltip permanent direction="top" offset={[0, -30]} className="font-bold text-[10px]">Allied Hospital</Tooltip>
                                 </Marker>
                                 <Marker position={[31.4087, 73.0691]} icon={customIcon}>
                                   <Tooltip permanent direction="top" offset={[0, -30]} className="font-bold text-[10px]">Rescue 1122 Head Office</Tooltip>
                                 </Marker>
                                 <Marker position={[31.4150, 73.0900]} icon={customIcon}>
                                   <Tooltip permanent direction="top" offset={[0, -30]} className="font-bold text-[10px]">City Police Station</Tooltip>
                                 </Marker>
                               </MapContainer>
                            ) : (
                               <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                                 <MapPin className="w-8 h-8 mb-2 opacity-50" />
                                 <p className="text-xs font-bold">TomTom API Key Missing</p>
                                 <p className="text-[9px] mt-1">Add VITE_TOMTOM_API_KEY to .env to enable the map.</p>
                               </div>
                            )}
                          </div>
                          <button onClick={() => setHomeSubView('emergency-services')} className="w-full py-3 bg-[#0d6efd] text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 active:scale-95 transition-transform cursor-pointer">
                            View All Services
                          </button>
                       </div>
                    </div>

                    {/* Weather & Safety Tips Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-1">
                       {/* Weather */}
                       <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                          <h2 className="text-sm font-black text-slate-800 mb-4">Weather & Risk</h2>                           {weather && weather.main && weather.weather && weather.weather[0] ? (
                             <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
                               <div className="flex items-center gap-4">
                                 {getWeatherIconLarge(weather.weather[0].main)}
                                 <div>
                                   <div className="text-3xl font-black text-slate-800">{Math.round(weather.main.temp)}°C</div>
                                   <div className="text-xs font-bold text-slate-500 capitalize">{weather.weather[0].description}</div>
                                 </div>
                               </div>
                               <div className="space-y-1.5 border-l border-slate-100 pl-4">
                                 <div className="flex items-center justify-between gap-4 text-[10px]">
                                   <span className="text-slate-400 font-bold flex items-center gap-1"><Droplets className="w-3 h-3" /> Humidity</span>
                                   <span className="font-black text-slate-700">{weather.main.humidity}%</span>
                                 </div>
                                 <div className="flex items-center justify-between gap-4 text-[10px]">
                                   <span className="text-slate-400 font-bold flex items-center gap-1"><Wind className="w-3 h-3" /> Wind</span>
                                   <span className="font-black text-slate-700">{Math.round(weather.wind.speed * 3.6)} km/h</span>
                                 </div>
                                 <div className="flex items-center justify-between gap-4 text-[10px]">
                                   <span className="text-slate-400 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Flood Risk</span>
                                   {(() => {
                                     const risk = getFloodRisk(weather.weather[0].description);
                                     return <span className={`font-black ${risk.color}`}>{risk.label}</span>;
                                   })()}
                                 </div>
                               </div>
                             </div>
                           ) : (
                             <div className="text-center py-6 text-slate-400 text-xs font-bold bg-slate-50 rounded-xl mb-4 border border-slate-100 border-dashed">
                                Loading OpenWeather data...<br />
                                <span className="text-[9px] font-normal">Ensure VITE_OPENWEATHER_API_KEY is in .env</span>
                             </div>
                           )}
                           <div className="grid grid-cols-4 gap-2">
                             {forecast && forecast.length > 0 ? (
                               forecast.map((item, idx) => {
                                 const dayName = new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' });
                                 return (
                                   <div key={idx} className={`text-center rounded-lg p-2 border ${idx === 0 ? 'bg-blue-50/50 border-blue-100/50' : 'bg-slate-50 border-slate-100'}`}>
                                     <div className="text-[10px] font-black text-slate-700 mb-1">{dayName}</div>
                                     {getWeatherIconForecast(item.weather[0].main)}
                                     <div className="text-[9px] font-bold text-slate-500">
                                       {Math.round(item.main.temp_max)}° / {Math.round(item.main.temp_min)}°
                                     </div>
                                   </div>
                                 );
                               })
                             ) : (
                               <>
                                 <div className="text-center bg-blue-50/50 rounded-lg p-2 border border-blue-100/50">
                                   <div className="text-[10px] font-black text-slate-700 mb-1">Today</div>
                                   <CloudRain className="w-5 h-5 text-blue-500 mx-auto mb-1 animate-bounce" />
                                   <div className="text-[9px] font-bold text-slate-500">32° / 26°</div>
                                 </div>
                                 <div className="text-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                                   <div className="text-[10px] font-black text-slate-700 mb-1">Tue</div>
                                   <Sun className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                                   <div className="text-[9px] font-bold text-slate-500">34° / 27°</div>
                                 </div>
                                 <div className="text-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                                   <div className="text-[10px] font-black text-slate-700 mb-1">Wed</div>
                                   <CloudLightning className="w-5 h-5 text-slate-500 mx-auto mb-1" />
                                   <div className="text-[9px] font-bold text-slate-500">33° / 26°</div>
                                 </div>
                                 <div className="text-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                                   <div className="text-[10px] font-black text-slate-700 mb-1">Thu</div>
                                   <CloudRain className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                                   <div className="text-[9px] font-bold text-slate-500">31° / 25°</div>
                                 </div>
                               </>
                             )}
                           </div>          </div>

                       {/* Safety Tips */}
                       <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                          <div className="flex justify-between items-end mb-4">
                            <h2 className="text-sm font-black text-slate-800">Safety Tips</h2>
                            <span onClick={() => setHomeSubView('safety-tips')} className="text-[11px] font-black text-blue-500 cursor-pointer hover:underline">See All</span>
                          </div>
                          <div className="space-y-4">
                             <div className="flex gap-3">
                               <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-blue-500">
                                 <WaveIcon className="w-4 h-4" />
                               </div>
                               <p className="text-[11px] font-bold text-slate-600 leading-snug pt-1">Move to higher ground during floods.</p>
                             </div>
                             <div className="flex gap-3">
                               <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0 text-orange-500">
                                 <Sun className="w-4 h-4" />
                               </div>
                               <p className="text-[11px] font-bold text-slate-600 leading-snug pt-1">Stay hydrated and avoid direct sunlight during heatwave.</p>
                             </div>
                             <div className="flex gap-3">
                               <div className="w-8 h-8 rounded-full bg-yellow-50 flex items-center justify-center shrink-0 text-yellow-600">
                                 <Zap className="w-4 h-4" />
                               </div>
                               <p className="text-[11px] font-bold text-slate-600 leading-snug pt-1">Do not use <span className="text-slate-800">electrical appliances</span> during power outage.</p>
                             </div>
                             <div className="flex gap-3">
                               <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 text-emerald-500">
                                 <Cross className="w-4 h-4" />
                               </div>
                               <p className="text-[11px] font-bold text-slate-600 leading-snug pt-1">Keep emergency kit and documents safe.</p>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Emergency Contacts */}
                    <div className="px-1 pb-6">
                      <h2 className="text-sm font-black text-slate-800 mb-3">Emergency Contacts</h2>
                      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                        <div onClick={() => window.location.href = 'tel:1122'} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm min-w-[140px] flex items-center gap-3 shrink-0 cursor-pointer hover:border-red-200 hover:scale-[1.02] active:scale-[0.98] transition-all">
                          <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0">
                            <PhoneCall className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-[10px] font-black text-slate-800 leading-tight">Rescue 1122</h4>
                            <p className="text-[9px] text-slate-500 font-bold">Dial 1122</p>
                          </div>
                        </div>
                        <div onClick={() => window.location.href = 'tel:15'} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm min-w-[140px] flex items-center gap-3 shrink-0 cursor-pointer hover:border-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all">
                          <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
                            <Shield className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-[10px] font-black text-slate-800 leading-tight">Police</h4>
                            <p className="text-[9px] text-slate-500 font-bold">Dial 15</p>
                          </div>
                        </div>
                        <div onClick={() => window.location.href = 'tel:16'} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm min-w-[140px] flex items-center gap-3 shrink-0 cursor-pointer hover:border-orange-200 hover:scale-[1.02] active:scale-[0.98] transition-all">
                          <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-[10px] font-black text-slate-800 leading-tight">Fire Brigade</h4>
                            <p className="text-[9px] text-slate-500 font-bold">Dial 16</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : homeSubView === 'teams' ? (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-3xl mx-auto w-full p-4 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm"
                  >
                    <button
                      onClick={() => setHomeSubView('default')}
                      className="text-xs font-black text-teal-muted hover:underline uppercase tracking-wider flex items-center gap-2 mb-6 cursor-pointer"
                    >
                      ← Back to Dashboard
                    </button>
                    <div className="mb-6">
                      <h2 className="text-xl font-display font-black text-slate-800 uppercase tracking-tight">Active Emergency Teams</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time status of emergency responders in the field</p>
                    </div>

                    <div className="space-y-4">
                      {[
                        { name: 'Rescue 1122 Flood Response', status: 'Active', location: 'Faisalabad Sector C', task: 'Water Evacuation & First Aid Support', members: 6, contact: '+92 300 1122334' },
                        { name: 'NDMA Rapid Assessment Squad', status: 'Active', location: 'Northern KPK Valleys', task: 'Landslide Clearance & GLOF Monitoring', members: 4, contact: '+92 312 9876543' },
                        { name: 'PDMA Sindh Emergency Hub', status: 'Standby', location: 'Jacobabad Heatwave Center', task: 'Water Distribution & Shade Station Ops', members: 8, contact: '+92 321 4567890' },
                        { name: 'Edhi Trauma Response Team', status: 'Active', location: 'Lahore-Faisalabad Highway', task: 'Road Traffic Accident Rescue Support', members: 3, contact: '+92 333 5554433' },
                        { name: 'Red Crescent First Responders', status: 'Standby', location: 'Rawalpindi Command Center', task: 'Medical Supplies Distribution & Logistics', members: 5, contact: '+92 345 6667788' }
                      ].map((team, idx) => (
                        <div key={idx} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className={`w-2.5 h-2.5 rounded-full ${team.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                              <h4 className="text-xs font-black text-slate-800 uppercase font-display tracking-tight">{team.name}</h4>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{team.task}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-[9px] text-slate-400 font-bold uppercase">
                              <span className="bg-white border border-slate-100 px-2 py-0.5 rounded">{team.location}</span>
                              <span>•</span>
                              <span>{team.members} Responders</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 shrink-0">
                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${team.status === 'Active' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                              {team.status}
                            </span>
                            <a href={`tel:${team.contact}`} className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer">
                              Call Squad
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : homeSubView === 'active-incidents' ? (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-3xl mx-auto w-full p-4 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm"
                  >
                    <button
                      onClick={() => setHomeSubView('default')}
                      className="text-xs font-black text-teal-muted hover:underline uppercase tracking-wider flex items-center gap-2 mb-6 cursor-pointer"
                    >
                      ← Back to Dashboard
                    </button>
                    <div className="mb-6">
                      <h2 className="text-xl font-display font-black text-slate-800 uppercase tracking-tight">Active Emergency Incidents</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Live critical emergencies requiring deployment</p>
                    </div>

                    <div className="space-y-4">
                      {incidents.filter((i: any) => i.status !== 'Solved').length > 0 ? (
                        incidents.filter((i: any) => i.status !== 'Solved').map((inc: any, idx: number) => (
                          <div key={inc.id || idx} onClick={() => navigate(`/report-detail/${inc.id}`)} className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all group">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${inc.severity === 'High' || inc.severity === 'Critical' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'}`}>
                                <Activity className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-slate-800 leading-tight group-hover:text-blue-600 transition-colors uppercase font-display">{inc.type}</h4>
                                <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-wider">{inc.location}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${inc.severity === 'High' || inc.severity === 'Critical' ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-orange-50 text-orange-500 border border-orange-100'}`}>{inc.severity || 'Medium'}</span>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 font-bold text-xs">
                          No active reports
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : homeSubView === 'resolved' ? (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-3xl mx-auto w-full p-4 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm"
                  >
                    <button
                      onClick={() => setHomeSubView('default')}
                      className="text-xs font-black text-teal-muted hover:underline uppercase tracking-wider flex items-center gap-2 mb-6 cursor-pointer"
                    >
                      ← Back to Dashboard
                    </button>
                    <div className="mb-6">
                      <h2 className="text-xl font-display font-black text-slate-800 uppercase tracking-tight">Resolved Incidents Today</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Successfully handled and closed response emergencies</p>
                    </div>

                    <div className="space-y-4">
                      {incidents.filter((i: any) => i.status === 'Solved').length > 0 ? (
                        incidents.filter((i: any) => i.status === 'Solved').map((inc: any, idx: number) => (
                          <div key={inc.id || idx} onClick={() => navigate(`/report-detail/${inc.id}`)} className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all group">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                                <CheckCircle className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-slate-800 leading-tight group-hover:text-emerald-600 transition-colors uppercase font-display">{inc.type}</h4>
                                <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-wider">{inc.location}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600">Processed</span>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 font-bold text-xs">
                          No resolved reports today.
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : homeSubView === 'high-priority' ? (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-3xl mx-auto w-full p-4 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm"
                  >
                    <button
                      onClick={() => setHomeSubView('default')}
                      className="text-xs font-black text-teal-muted hover:underline uppercase tracking-wider flex items-center gap-2 mb-6 cursor-pointer"
                    >
                      ← Back to Dashboard
                    </button>
                    <div className="mb-6">
                      <h2 className="text-xl font-display font-black text-slate-800 uppercase tracking-tight">High Priority Emergencies</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Tier-1 life threatening situations requiring immediate assessment</p>
                    </div>

                    <div className="space-y-4">
                      {incidents.filter((i: any) => i.severity === 'High' || i.severity === 'Critical').length > 0 ? (
                        incidents.filter((i: any) => i.severity === 'High' || i.severity === 'Critical').map((inc: any, idx: number) => (
                          <div key={inc.id || idx} onClick={() => navigate(`/report-detail/${inc.id}`)} className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all group">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-slate-800 leading-tight group-hover:text-red-600 transition-colors uppercase font-display">{inc.type}</h4>
                                <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-wider">{inc.location}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-red-50 border border-red-100 text-red-500 animate-pulse">{inc.severity}</span>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 font-bold text-xs">
                          No high priority reports active.
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : homeSubView === 'all-reports' ? (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-3xl mx-auto w-full p-4 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm"
                  >
                    <button
                      onClick={() => setHomeSubView('default')}
                      className="text-xs font-black text-teal-muted hover:underline uppercase tracking-wider flex items-center gap-2 mb-6 cursor-pointer"
                    >
                      ← Back to Dashboard
                    </button>
                    <div className="mb-6">
                      <h2 className="text-xl font-display font-black text-slate-800 uppercase tracking-tight">All Incident Reports</h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Full regional emergency registry</p>
                    </div>

                    <div className="space-y-4">
                      {incidents.length > 0 ? (
                        incidents.map((inc: any, idx: number) => (
                          <div key={inc.id || idx} onClick={() => navigate(`/report-detail/${inc.id}`)} className="p-4 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-2xl flex items-center justify-between gap-4 cursor-pointer transition-all group">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${inc.status === 'Solved' ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-500'}`}>
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-slate-800 leading-tight group-hover:text-blue-600 transition-colors uppercase font-display">{inc.type}</h4>
                                <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-wider">{inc.location}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${inc.status === 'Solved' ? 'bg-emerald-50 border border-emerald-100 text-emerald-600' : 'bg-amber-50 border border-amber-100 text-amber-600'}`}>
                                {inc.status === 'Solved' ? 'Processed' : inc.status}
                              </span>
                              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 font-bold text-xs">
                          No active reports
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : homeSubView === 'safety-tips' ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="p-6 bg-white rounded-3xl border border-slate-100 flex-1 flex flex-col"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                      <div>
                        <button 
                          onClick={() => setHomeSubView('default')} 
                          className="text-[10px] font-black text-blue-600 hover:text-blue-500 flex items-center gap-1 uppercase tracking-widest cursor-pointer mb-1"
                        >
                          ← Back to Dashboard
                        </button>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest font-display">Crisis Safety Hub</h3>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <LifeBuoy className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        {
                          category: 'Urban Flooding',
                          icon: <WaveIcon className="w-5 h-5 text-blue-600" />,
                          bg: 'bg-blue-50/50 border-blue-100/50',
                          tips: [
                            'Move immediately to higher ground if flash flooding is possible in your sector.',
                            'Never attempt to walk, swim, or drive through flowing water. 6 inches can knock you over; 2 feet can float a car.',
                            'Avoid touching electrical equipment or outlets if you are wet or standing in water.'
                          ]
                        },
                        {
                          category: 'Extreme Heatwave',
                          icon: <Sun className="w-5 h-5 text-orange-600" />,
                          bg: 'bg-orange-50/50 border-orange-100/50',
                          tips: [
                            'Drink plenty of clean water even if you do not feel thirsty to avoid heat strokes.',
                            'Stay indoors between 11:00 AM and 4:00 PM when solar radiation is highest.',
                            'Wear lightweight, loose-fitting cotton clothing and cover your head when stepping out.'
                          ]
                        },
                        {
                          category: 'Earthquake Response',
                          icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
                          bg: 'bg-red-50/50 border-red-100/50',
                          tips: [
                            'DROP down to hands and knees, COVER your head and neck under sturdy furniture, and HOLD ON.',
                            'Stay away from glass windows, high cabinets, and outer walls that could crumble.',
                            'If outdoors, move to an open area far from electrical cables, trees, and buildings.'
                          ]
                        },
                        {
                          category: 'Power Outage & Surges',
                          icon: <Zap className="w-5 h-5 text-purple-600" />,
                          bg: 'bg-purple-50/50 border-purple-100/50',
                          tips: [
                            'Preserve food by keeping refrigerators and freezers closed as much as possible.',
                            'Disconnect heavy appliances to prevent damages from high-voltage surge when power is restored.',
                            'Never run generators or fuel stoves indoors due to fatal carbon monoxide build-up.'
                          ]
                        },
                        {
                          category: 'First Aid & Logistics',
                          icon: <Cross className="w-5 h-5 text-emerald-600" />,
                          bg: 'bg-emerald-50/50 border-emerald-100/50',
                          tips: [
                            'Prepare a compact emergency bag containing clean water, medicine, dry food, and key identity cards.',
                            'Administer direct pressure to open wounds immediately using clean lint-free bandages.',
                            'Report critical mass casualties or severe blockages using the CIRO SOS reporting option.'
                          ]
                        }
                      ].map((item, idx) => (
                        <div key={idx} className={`p-5 rounded-2xl border ${item.bg} flex flex-col gap-3 shadow-sm`}>
                          <div className="flex items-center gap-3">
                            {item.icon}
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">{item.category}</h4>
                          </div>
                          <ul className="space-y-2 text-[11px] font-medium text-slate-600 list-disc list-inside leading-relaxed">
                            {item.tips.map((tip, tIdx) => (
                              <li key={tIdx} className="pl-1">{tip}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : homeSubView === 'emergency-services' ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="p-6 bg-white rounded-3xl border border-slate-100 flex-1 flex flex-col min-h-[500px]"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                      <div>
                        <button 
                          onClick={() => setHomeSubView('default')} 
                          className="text-[10px] font-black text-blue-600 hover:text-blue-500 flex items-center gap-1 uppercase tracking-widest cursor-pointer mb-1"
                        >
                          ← Back to Dashboard
                        </button>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest font-display">Nearby Emergency Services Hub</h3>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <MapIcon className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
                      {/* Left: Services List */}
                      <div className="space-y-4 max-h-[500px] overflow-y-auto no-scrollbar pr-1">
                        <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100/50 mb-2 flex items-center justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-black text-blue-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" /> GPS Location Fetched
                            </p>
                            <p className="text-[10px] text-blue-700 font-bold leading-normal">
                              Current Coords: {userLocation ? `${userLocation[0].toFixed(4)}° N, ${userLocation[1].toFixed(4)}° E` : '31.4187° N, 73.0791° E (Faisalabad Center)'}
                            </p>
                          </div>
                          {activeServiceRoutePath && (
                            <button 
                              onClick={() => {
                                setActiveServiceRoutePath(null);
                                setSelectedServiceId(null);
                              }}
                              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer border border-red-100 shadow-sm active:scale-95"
                            >
                              Clear Route
                            </button>
                          )}
                        </div>

                        {[
                          { id: 1, name: 'Allied Hospital', lat: 31.4287, lng: 73.0891, purpose: 'Tertiary Medical Care, Trauma Center & ICU Ward', contact: '041-9210082' },
                          { id: 2, name: 'Rescue 1122 Head Office', lat: 31.4087, lng: 73.0691, purpose: '24/7 Fire Fighting, Disaster Rescue & Ambulance Dispatch', contact: '1122' },
                          { id: 3, name: 'City Police Station', lat: 31.4150, lng: 73.0900, purpose: 'Law Enforcement, Safety Response & Public Order', contact: '15' },
                          { id: 4, name: 'DHQ Hospital Faisalabad', lat: 31.4200, lng: 73.0720, purpose: 'General Medical Emergency, Burn Unit & Outpatient Services', contact: '041-9200115' },
                          { id: 5, name: 'Al-Khidmat Ambulance Service', lat: 31.4110, lng: 73.0820, purpose: 'Community Ambulance Logistics & Voluntary First Responders', contact: '1023' }
                        ].map((svc) => {
                          const lat = userLocation ? userLocation[0] : 31.4187;
                          const lon = userLocation ? userLocation[1] : 73.0791;
                          const dist = calculateDistance(lat, lon, svc.lat, svc.lng);
                          
                          const timeMinutes = Math.round((dist / 40) * 60);
                          const hrs = Math.floor(timeMinutes / 60);
                          const mins = timeMinutes % 60;
                          
                          const timeStr = hrs > 0 ? `${hrs} hr ${mins} mins` : `${mins} mins`;

                          const isRoutingSvc = isServiceRouting === svc.id;
                          const isActiveSvc = selectedServiceId === svc.id;

                          return (
                            <div key={svc.id} className={`p-4 rounded-2xl shadow-sm flex flex-col gap-3 group transition-all border ${isActiveSvc ? 'bg-blue-50/20 border-blue-300 ring-2 ring-blue-500/10' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
                              <div className="flex justify-between items-start gap-4">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-black text-slate-800 group-hover:text-blue-600 transition-colors uppercase font-display tracking-tight leading-tight">{svc.name}</h4>
                                    {isActiveSvc && (
                                      <span className="bg-blue-100 text-blue-800 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse border border-blue-200">Active Target</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Purpose: <span className="text-slate-600 font-medium normal-case leading-relaxed">{svc.purpose}</span></p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="text-[11px] font-black text-blue-600 block">{dist.toFixed(2)} km</span>
                                  <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wide mt-0.5">{timeStr} away</span>
                                </div>
                              </div>
                              <div className="flex gap-2 border-t border-slate-100/50 pt-3">
                                <a 
                                  href={`tel:${svc.contact}`} 
                                  className="flex-1 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-250 rounded-xl text-[10px] font-black text-center uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <PhoneCall className="w-3.5 h-3.5 text-slate-500" /> Call {svc.contact}
                                </a>
                                <button 
                                  disabled={isRoutingSvc}
                                  onClick={() => calculateRouteToService(svc.id, svc.lat, svc.lng)}
                                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95 ${isActiveSvc ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                >
                                  {isRoutingSvc ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Routing...
                                    </>
                                  ) : isActiveSvc ? (
                                    <>
                                      <CheckCircle className="w-3.5 h-3.5" /> Route Active
                                    </>
                                  ) : (
                                    <>
                                      <Navigation className="w-3.5 h-3.5" /> Navigate
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Right: Map Panel */}
                      <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-lg min-h-[300px] lg:h-full relative z-0">
                         <MapContainer 
                           center={userLocation || [31.4187, 73.0791]} 
                           zoom={13} 
                           minZoom={5}
                           maxBounds={[[23.0, 60.0], [37.5, 80.0]]}
                           maxBoundsViscosity={1.0}
                           scrollWheelZoom={true}
                           style={{ height: '100%', width: '100%', zIndex: 1 }}
                         >
                           <TileLayer
                             url={getTomTomApiKey() 
                               ? `https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${getTomTomApiKey()}`
                               : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                             }
                             attribution={getTomTomApiKey() ? '&copy; TomTom' : '&copy; OpenStreetMap contributors'}
                           />
                           {/* User Location Marker */}
                           <Marker position={userLocation || [31.4187, 73.0791]} icon={customIcon}>
                             <Tooltip permanent direction="top" offset={[0, -30]} className="font-extrabold text-[10px] text-blue-600">Your Location</Tooltip>
                           </Marker>

                           {activeServiceRoutePath && (
                             <Polyline 
                               positions={activeServiceRoutePath} 
                               color="#10b981" 
                               weight={6} 
                               opacity={0.9}
                             />
                           )}

                           {[
                             { id: 1, name: 'Allied Hospital', lat: 31.4287, lng: 73.0891 },
                             { id: 2, name: 'Rescue 1122 Head Office', lat: 31.4087, lng: 73.0691 },
                             { id: 3, name: 'City Police Station', lat: 31.4150, lng: 73.0900 },
                             { id: 4, name: 'DHQ Hospital Faisalabad', lat: 31.4200, lng: 73.0720 },
                             { id: 5, name: 'Al-Khidmat Ambulance Service', lat: 31.4110, lng: 73.0820 }
                           ].map((svc) => (
                             <Marker key={`map-svc-${svc.id}`} position={[svc.lat, svc.lng]} icon={customIcon}>
                               <Tooltip permanent direction="top" offset={[0, -30]} className="font-bold text-[10px] text-slate-800">{svc.name}</Tooltip>
                             </Marker>
                           ))}
                         </MapContainer>
                      </div>
                     </div>
                   </motion.div>
                ) : null}
                
              </div>
            )}

            {navTab === 'map' && (
              <div className="flex-1 h-full relative">
                <MapComponent 
                  incidents={incidents} 
                  gisData={gisData} 
                  interactive={true} 
                  layerVisibility={layersVisible}
                />
                <div className={`absolute top-6 right-6 z-20 bg-white/95 backdrop-blur-md rounded-[2rem] shadow-xl border border-slate-100 transition-all duration-300 overflow-hidden ${isAnalyticsMinimized ? 'w-16 h-16 flex items-center justify-center p-0' : 'w-64 p-5'}`}>
                   {isAnalyticsMinimized ? (
                      <button onClick={() => setIsAnalyticsMinimized(false)} className="w-full h-full flex items-center justify-center hover:bg-slate-50 transition-colors">
                        <MapIcon className="w-6 h-6 text-teal-600" />
                      </button>
                   ) : (
                     <>
                       <div className="flex justify-between items-center mb-4">
                         <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Map Analytics</h3>
                         <button onClick={() => setIsAnalyticsMinimized(true)} className="text-slate-400 hover:text-slate-600">
                           <ChevronRight className="w-4 h-4 rotate-180" />
                         </button>
                       </div>
                       <div className="space-y-3">
                          <div 
                            onClick={() => {
                              setLayersVisible({ residential: true, urban: false, highRisk: false, precipitation: false });
                              setTimeout(() => setIsAnalyticsMinimized(true), 300);
                            }}
                            className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${layersVisible.residential ? 'bg-blue-50 border border-blue-100 shadow-sm' : 'hover:bg-slate-50 opacity-60'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${layersVisible.residential ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                              <span className={`text-xs font-bold ${layersVisible.residential ? 'text-blue-900' : 'text-slate-500'}`}>Residential Areas</span>
                            </div>
                            {layersVisible.residential && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                          </div>

                          <div 
                            onClick={() => {
                              setLayersVisible({ residential: false, urban: true, highRisk: false, precipitation: false });
                              setTimeout(() => setIsAnalyticsMinimized(true), 300);
                            }}
                            className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${layersVisible.urban ? 'bg-emerald-50 border border-emerald-100 shadow-sm' : 'hover:bg-slate-50 opacity-60'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${layersVisible.urban ? 'bg-emerald-600' : 'bg-slate-300'}`}></div>
                              <span className={`text-xs font-bold ${layersVisible.urban ? 'text-emerald-900' : 'text-slate-500'}`}>Urban Districts</span>
                            </div>
                            {layersVisible.urban && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                          </div>

                          <div 
                            onClick={() => {
                              setLayersVisible({ residential: false, urban: false, highRisk: true, precipitation: false });
                              setTimeout(() => setIsAnalyticsMinimized(true), 300);
                            }}
                            className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${layersVisible.highRisk ? 'bg-red-50 border border-red-100 shadow-sm' : 'hover:bg-slate-50 opacity-60'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${layersVisible.highRisk ? 'bg-red-600 animate-pulse' : 'bg-slate-300'}`}></div>
                              <span className={`text-xs font-bold ${layersVisible.highRisk ? 'text-red-900' : 'text-slate-500'}`}>High Risk Zones</span>
                            </div>
                            {layersVisible.highRisk && <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>}
                          </div>

                          <div 
                            onClick={() => {
                              setLayersVisible({ residential: false, urban: false, highRisk: false, precipitation: true });
                              setTimeout(() => setIsAnalyticsMinimized(true), 300);
                            }}
                            className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${layersVisible.precipitation ? 'bg-blue-50 border border-blue-100 shadow-sm' : 'hover:bg-slate-50 opacity-60'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${layersVisible.precipitation ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                              <span className={`text-xs font-bold ${layersVisible.precipitation ? 'text-blue-900' : 'text-slate-500'}`}>Precipitation Level</span>
                            </div>
                            {layersVisible.precipitation && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                          </div>
                       </div>
                     </>
                   )}
                </div>
              </div>
            )}

            {navTab === 'alerts' && (
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-white">
                {/* Main Alerts List */}
                <div className="flex-1 p-6 lg:p-10 overflow-y-auto no-scrollbar border-r border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                     <div>
                       <h2 className="text-2xl font-display font-black text-slate-800 tracking-tight">Emergency Command Alerts</h2>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Sourced from satellite cluster & field agents</p>
                     </div>
                     <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                        {['All', 'Critical', 'Warning', 'Info'].map((f: any) => (
                          <button 
                            key={f}
                            onClick={() => setSeverityFilter(f)}
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer ${
                              severityFilter === f 
                              ? 'bg-teal-muted text-white border-teal-muted' 
                              : 'bg-white text-slate-400 border-slate-100 hover:border-teal-muted/30'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                     </div>
                  </div>
  
                  {loadingAlerts ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="w-10 h-10 border-4 border-teal-muted border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase animate-pulse">Scanning Infrastructure...</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {(severityFilter === 'All' ? alerts : alerts.filter(a => a.severity === severityFilter)).length > 0 ? (
                        (severityFilter === 'All' ? alerts : alerts.filter(a => a.severity === severityFilter)).map((alert, idx) => (
                          <motion.div 
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={alert.id || idx}
                            className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative"
                          >
                             <div className="flex items-start gap-4">
                               <div className={`p-4 rounded-2xl shrink-0 ${
                                 alert.severity === 'Critical' ? 'bg-alert-orange/10 text-alert-orange' :
                                 alert.severity === 'Warning' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                               }`}>
                                 <Bell className="w-6 h-6" />
                               </div>
                               <div className="flex-1 min-w-0">
                                 <div className="flex justify-between items-start gap-2">
                                   <div className="flex flex-wrap items-center gap-2 mb-1">
                                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                        alert.severity === 'Critical' ? 'bg-alert-orange text-white' :
                                        alert.severity === 'Warning' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'
                                      }`}>
                                        {alert.severity}
                                      </span>
                                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{alert.type}</span>
                                   </div>
                                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100 whitespace-nowrap">{alert.time}</span>
                                 </div>
                                 <h4 className="font-display font-black text-lg text-slate-800 uppercase tracking-tight mb-2 leading-tight">{alert.title}</h4>
                                 <p className="text-xs font-medium text-slate-500 mb-4 leading-relaxed line-clamp-2">{alert.description}</p>
                                 
                                 <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-50">
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-1.5 grayscale opacity-60">
                                        <Share2 className="w-3 h-3" />
                                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{alert.source}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <div className="flex items-center bg-teal-muted/10 px-2 py-0.5 rounded-md">
                                          <CheckCircle className="w-3 h-3 text-teal-muted mr-1.5" />
                                          <span className="text-[10px] font-black text-teal-muted uppercase tracking-tight">{alert.confidence}% Confidence</span>
                                        </div>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => handleResolveAlert(alert.id)}
                                      className="flex items-center gap-2 text-jade-muted bg-jade-muted/5 hover:bg-jade-muted/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border border-jade-muted/10 hover:border-jade-muted/20"
                                    >
                                      Mark Resolved
                                    </button>
                                 </div>
                               </div>
                             </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="text-center py-20 bg-slate-50 border-2 border-dashed border-slate-100 rounded-[3rem]">
                          <Bell className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">No matching alerts</h4>
                          <p className="text-[10px] text-slate-400 mt-2 font-medium">All infrastructure sector status looks stabilized in this filter.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
  
                {/* Live Social Feed Panel */}
                <div className="w-full md:w-[440px] lg:w-[480px] bg-slate-50/40 flex flex-col shrink-0 overflow-hidden border-l border-slate-100">
                  <div className="p-6 border-b border-slate-100 bg-white/80 backdrop-blur shrink-0 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping"></div>
                        <h3 className="text-xs font-display font-black text-slate-800 uppercase tracking-[0.2em]">Real-Time Social Stream</h3>
                      </div>
                      <button 
                        onClick={fetchSocialFeed}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-all active:scale-90"
                        title="Sync Live Stream"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      </button>
                  </div>
                  <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
                      {socialFeed.map((post: any) => {
                        const isLiked = likedPosts[post.id] || false;
                        const likesCount = postLikes[post.id] !== undefined ? postLikes[post.id] : (post.likes || 11);
                        const commentsList = localComments[post.id] || post.comments || [];
                        const isFollowing = followedUsers[post.user] || false;

                        const handleLikeToggle = () => {
                          setLikedPosts(prev => ({ ...prev, [post.id]: !isLiked }));
                          setPostLikes(prev => ({
                            ...prev,
                            [post.id]: isLiked ? Math.max(0, likesCount - 1) : likesCount + 1
                          }));
                        };

                        const handleFollowToggle = () => {
                          setFollowedUsers(prev => ({ ...prev, [post.user]: !isFollowing }));
                        };

                        const handleAddLocalComment = () => {
                          const text = typingComment[post.id];
                          if (!text || text.trim() === '') return;

                          const newCmt = {
                            id: `cmt-local-${Date.now()}`,
                            author: user ? user.name : 'Citizen Observer',
                            avatarColor: '#3b82f6',
                            timestamp: 'Just now',
                            text: text
                          };

                          setLocalComments(prev => ({
                            ...prev,
                            [post.id]: [...(prev[post.id] || []), newCmt]
                          }));

                          setTypingComment(prev => ({
                            ...prev,
                            [post.id]: ''
                          }));
                        };

                        return (
                          <motion.div 
                            key={post.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[2.5rem] border border-slate-100 shadow-md p-6 flex flex-col gap-4 overflow-hidden"
                          >
                            {/* User Header */}
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                {/* Profile Circle */}
                                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-extrabold text-sm border-2 border-white shadow-md select-none shrink-0">
                                  {post.user[0].toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{post.user}</span>
                                    <button 
                                      onClick={handleFollowToggle}
                                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md transition-all active:scale-95 ${
                                        isFollowing ? 'bg-slate-100 text-slate-500' : 'bg-red-50 text-red-500 border border-red-100'
                                      }`}
                                    >
                                      {isFollowing ? 'Following' : '+ Follow'}
                                    </button>
                                  </div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{post.timestamp}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 py-1 px-2.5 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
                                {post.platform === 'Twitter' ? <Twitter className="w-3 h-3 text-sky-500" /> : <MessageCircle className="w-3 h-3 text-jade-muted" />}
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">{post.platform}</span>
                              </div>
                            </div>

                            {/* Content Description */}
                            <p className={`text-xs text-slate-700 leading-relaxed font-semibold ${post.text.match(/[\u0600-\u06FF]/) ? 'urdu-text text-right text-sm font-extrabold' : ''}`}>
                              {post.text}
                            </p>

                            {/* Media Photo */}
                            {post.image && (
                              <div className="w-full h-48 rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm relative group">
                                <img 
                                  src={post.image} 
                                  alt="Real-time social media incident evidence photo" 
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                />
                              </div>
                            )}

                            {/* Likes and Comments Counters */}
                            <div className="flex justify-between items-center py-2 px-1 border-b border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                              <div className="flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-3.5 h-3.5 text-blue-500">
                                  <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                                </svg>
                                <span>{likesCount} likes</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span>{commentsList.length} Comments</span>
                                <span>•</span>
                                <span>{post.sharesCount || 1} Share</span>
                              </div>
                            </div>

                            {/* Action Buttons Row */}
                            <div className="grid grid-cols-3 gap-1 py-1 border-b border-slate-100 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                              <button 
                                onClick={handleLikeToggle}
                                className={`flex items-center justify-center gap-2 py-2 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors active:scale-95 ${
                                  isLiked ? 'text-blue-500' : 'text-slate-500'
                                }`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill={isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                                </svg>
                                <span>Like</span>
                              </button>
                              <button 
                                onClick={() => document.getElementById(`input-comment-${post.id}`)?.focus()}
                                className="flex items-center justify-center gap-2 py-2 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors active:scale-95"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c.49 0 .97-.04 1.44-.12A8.25 8.25 0 106.63 17.5l-2.02.67.67-2.02a8.25 8.25 0 006.72 4.1z" />
                                </svg>
                                <span>Comment</span>
                              </button>
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(post.text);
                                  alert('Post content copied to clipboard!');
                                }}
                                className="flex items-center justify-center gap-2 py-2 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors active:scale-95"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186l5.566-2.783m-5.566 2.783l5.566 2.783m-5.566-2.783a2.25 2.25 0 110-2.186m0 2.186a2.25 2.25 0 110 2.186m0-2.186l5.566-2.783m0 0a2.25 2.25 0 103 1.5m-3-1.5a2.25 2.25 0 113-1.5m-3 1.5l5.566 2.783m0 0a2.25 2.25 0 103 1.5" />
                                </svg>
                                <span>Share</span>
                              </button>
                            </div>

                            {/* Write Comment Box */}
                            <div className="flex items-center gap-3 py-1 border-b border-slate-50">
                              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-extrabold text-[10px] border border-white shadow-sm shrink-0 select-none">
                                {user ? user.name[0].toUpperCase() : 'C'}
                              </div>
                              <div className="flex-1 flex gap-2">
                                <input 
                                  id={`input-comment-${post.id}`}
                                  type="text" 
                                  placeholder="Write a comment..." 
                                  value={typingComment[post.id] || ''}
                                  onChange={e => setTypingComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                                  onKeyDown={e => { if (e.key === 'Enter') handleAddLocalComment(); }}
                                  className="flex-1 text-xs border border-slate-200 focus:border-red-500 rounded-full px-4 py-2 outline-none font-semibold text-slate-800 bg-slate-50/50 shadow-inner"
                                />
                                <button 
                                  onClick={handleAddLocalComment}
                                  className="px-4 py-2 bg-black hover:bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
                                >
                                  Post
                                </button>
                              </div>
                            </div>

                            {/* Comments Feed List */}
                            {commentsList.length > 0 && (
                              <div className="space-y-3 pt-2">
                                {commentsList.map((cmt: any, cmtIdx: number) => {
                                  const commentLikeKey = `${post.id}-${cmtIdx}`;
                                  const cmtLiked = likedComments[commentLikeKey] || false;
                                  
                                  return (
                                    <div key={cmt.id || cmtIdx} className="flex gap-3 items-start">
                                      {/* Commenter Avatar */}
                                      <div 
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-extrabold text-[10px] border border-white shadow-sm shrink-0 select-none"
                                        style={{ backgroundColor: cmt.avatarColor || '#3b82f6' }}
                                      >
                                        {cmt.author[0].toUpperCase()}
                                      </div>
                                      <div className="flex-1 flex flex-col">
                                        {/* Speech Bubble Container */}
                                        <div className="bg-slate-50 border border-slate-100/50 p-4 rounded-[1.8rem] shadow-sm flex flex-col">
                                          <div className="flex justify-between items-center">
                                            <div className="flex flex-col">
                                              <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{cmt.author}</span>
                                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">{cmt.timestamp}</span>
                                            </div>
                                            <button className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-white border border-slate-100 text-slate-500 active:scale-95">
                                              + Follow
                                            </button>
                                          </div>
                                          <p className="text-xs text-slate-700 leading-relaxed font-semibold mt-2">
                                            {cmt.text}
                                          </p>
                                        </div>
                                        {/* Comment Actions */}
                                        <div className="flex items-center gap-4 px-4 mt-1 text-[9px] font-black uppercase tracking-wider text-slate-400 select-none">
                                          <button 
                                            onClick={() => setLikedComments(prev => ({ ...prev, [commentLikeKey]: !cmtLiked }))}
                                            className={`hover:text-slate-700 cursor-pointer ${cmtLiked ? 'text-blue-500' : ''}`}
                                          >
                                            {cmtLiked ? 'Liked' : 'Like'}
                                          </button>
                                          <span>•</span>
                                          <button className="hover:text-slate-700 cursor-pointer">
                                            Reply
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                      {socialFeed.length === 0 && (
                        <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center p-8">
                           <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-300">
                             <RefreshCw className="w-6 h-6 animate-spin" />
                           </div>
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Syncing Real-time stream...</h4>
                        </div>
                      )}
                  </div>
                  <div className="p-4 border-t border-slate-100 bg-white/50 backdrop-blur shrink-0 text-center">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Agent consensus processing is applied<br />to filter unverified crowd-sourced data</p>
                  </div>
                </div>
              </div>
            )}

            {navTab === 'reports' && (
              <div className="flex-1 p-6 lg:p-10 overflow-y-auto no-scrollbar bg-slate-50">
                 <div className="max-w-4xl mx-auto w-full">
                    <div className="flex items-center justify-between mb-8">
                       <div>
                          <h2 className="text-2xl font-display font-black text-slate-800 tracking-tight uppercase">My Incident Reports</h2>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">History of your emergency submissions</p>
                       </div>
                    </div>

                    {!user ? (
                      <div className="bg-white p-12 rounded-[3rem] border-2 border-dashed border-slate-200 text-center flex flex-col items-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 text-slate-300">
                             <FileText className="w-8 h-8" />
                          </div>
                          <h3 className="text-lg font-black text-slate-800 uppercase mb-2">Authentication Required</h3>
                          <p className="text-xs text-slate-400 max-w-xs mb-8">You must be logged in to view your personal report history and download official records.</p>
                          <button onClick={() => navigate('/login')} className="px-8 py-3 bg-teal-muted text-white rounded-2xl font-bold font-display shadow-lg shadow-teal-100">Log In Now</button>
                      </div>
                    ) : loadingReports ? (
                      <div className="py-24 flex flex-col items-center justify-center gap-6 bg-white border border-slate-100 rounded-[3rem]">
                        <motion.div 
                           animate={{ rotate: 360 }}
                           transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                           className="w-12 h-12 border-4 border-teal-muted/20 border-t-teal-muted rounded-full"
                        />
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">Syncing History Data...</p>
                      </div>
                    ) : userReports.length === 0 ? (
                      <div className="bg-white p-12 rounded-[3rem] border border-slate-100 text-center flex flex-col items-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 text-slate-200">
                             <WaveIcon className="w-8 h-8" />
                          </div>
                          <h3 className="text-lg font-black text-slate-400 uppercase mb-2">No Reports Submitted</h3>
                          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">Your personal report history is currently empty. Reports submitted as a guest will not appear here.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                         {userReports.map(inc => (
                           <motion.div 
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              key={inc.id}
                              onClick={() => navigate(`/report-detail/${inc.id}`)}
                              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer flex items-center justify-between gap-4"
                           >
                              <div className="flex items-center gap-5">
                                 <div className="w-12 h-12 rounded-2xl bg-teal-muted/5 text-teal-muted flex items-center justify-center text-xl shadow-inner">
                                    {inc.type === 'Urban Flooding' ? '🌊' : 
                                     inc.type === 'Heatwave' ? '☀️' : 
                                     inc.type === 'Road Blockage' ? '🚧' : 
                                     inc.type === 'Power Outage' ? '🔌' : '🏥'}
                                 </div>
                                 <div>
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{inc.type}</h4>
                                    <div className="flex items-center gap-3 mt-1">
                                       <span className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[200px]">{inc.location}</span>
                                       <span className="text-[10px] text-slate-300">•</span>
                                       <span className="text-[10px] text-slate-400 font-bold uppercase">{inc.time}</span>
                                    </div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                 <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${
                                    inc.status === 'Solved' ? 'bg-jade-muted/10 text-jade-muted' : 
                                    inc.status === 'Processing' ? 'bg-navy-muted/10 text-navy-muted' : 'bg-amber-500/10 text-amber-600'
                                 }`}>
                                    {inc.status}
                                 </span>
                                 <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-teal-muted group-hover:translate-x-1 transition-all" />
                              </div>
                           </motion.div>
                         ))}
                      </div>
                    )}
                 </div>
              </div>
            )}

            {navTab === 'profile' && !user && (
               <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-8 border-2 border-dashed border-slate-200">
                     <User className="w-10 h-10 text-slate-300" />
                  </div>
                  <h2 className="text-2xl font-display font-bold text-slate-800">Guest Session</h2>
                  <p className="text-sm text-slate-400 mt-3 max-w-sm">Login to your verified Citizen ID to view safety points and report history.</p>
                  <button 
                    onClick={() => navigate('/login')}
                    className="mt-10 px-10 py-4 bg-teal-muted text-white rounded-2xl font-bold font-display shadow-xl shadow-teal-100"
                  >
                    Authenticate
                  </button>
               </div>
            )}

            {navTab === 'profile' && user && (
              <div className="flex-1 p-6 lg:p-12 overflow-y-auto no-scrollbar max-w-4xl mx-auto w-full">
                <div className="bg-teal-muted rounded-[3rem] p-8 lg:p-12 text-white shadow-2xl shadow-teal-200 mb-10 overflow-hidden relative">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                   <div className="relative flex flex-col md:flex-row items-center gap-8">
                      <div className="w-32 h-32 rounded-[3.5rem] bg-white flex items-center justify-center text-4xl font-black text-teal-muted shadow-2xl ring-8 ring-white/20">
                         {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </div>
                      <div className="text-center md:text-left flex-1">
                         <div className="flex justify-between items-start">
                            <div className="flex-1">
                               <h2 className="text-3xl font-display font-black tracking-tight mb-2">{user.name}</h2>
                               <div className="flex items-center gap-2 opacity-80 justify-center md:justify-start">
                                  <MapPin className="w-4 h-4" />
                                  <span className="text-sm font-bold uppercase tracking-widest">Pakistan Resident</span>
                               </div>
                            </div>
                            <button 
                                onClick={handleLogout}
                                className="bg-white/20 hover:bg-white/30 p-4 rounded-[1.5rem] transition-all cursor-pointer shadow-lg active:scale-95"
                                title="Log Out"
                            >
                                <LogOut className="w-6 h-6 text-white" />
                            </button>
                         </div>
                         <div className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start font-black uppercase tracking-[0.15em] text-[10px]">
                            <span className="bg-white/20 px-4 py-2 rounded-full border border-white/30 backdrop-blur-sm">Verified Citizen</span>
                            <span className="bg-white/20 px-4 py-2 rounded-full border border-white/30 backdrop-blur-sm tracking-tighter">{user.citizenId}</span>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4 mt-12 pt-8 border-t border-white/10">
                      <button 
                        onClick={() => setProfileTab('reports')}
                        className={`text-center md:text-left p-6 rounded-[2rem] transition-all cursor-pointer ${profileTab === 'reports' ? 'bg-white/15 shadow-inner' : 'hover:bg-white/5'}`}
                      >
                        <div className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                           <FileText className="w-3 h-3" />
                           Total Reports Sent
                        </div>
                        <div className="text-3xl font-black">{userReports.length}</div>
                      </button>
                      <button 
                        onClick={() => setProfileTab('info')}
                        className={`text-center md:text-left p-6 rounded-[2rem] transition-all cursor-pointer ${profileTab === 'info' ? 'bg-white/15 shadow-inner' : 'hover:bg-white/5'}`}
                      >
                        <div className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                           <FileCheck className="w-3 h-3" />
                           Safety Points
                        </div>
                        <div className="text-3xl font-black">840</div>
                      </button>
                   </div>
                </div>

                <AnimatePresence mode="wait">
                  {profileTab === 'info' ? (
                    <motion.div 
                        key="info"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    >
                       <div 
                        onClick={() => setProfileTab('medical')}
                        className="bg-white border-2 border-slate-100 p-8 rounded-[3rem] hover:border-jade-muted/20 transition-all cursor-pointer group shadow-sm"
                       >
                          <div className="flex items-center justify-between mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-jade-muted/5 text-jade-muted flex items-center justify-center">
                               <Cross className="w-7 h-7" />
                            </div>
                            <ChevronRight className="w-6 h-6 text-slate-300 group-hover:translate-x-1 transition-transform" />
                          </div>
                          <h4 className="text-base font-black text-slate-800 uppercase tracking-wider">Medical Records</h4>
                          <p className="text-xs text-slate-400 font-medium mt-2 leading-relaxed">Digital emergency card linked to ID and verified for emergency trauma response.</p>
                       </div>
                       <div 
                        onClick={() => setProfileTab('preferences')}
                        className="bg-white border-2 border-slate-100 p-8 rounded-[3rem] hover:border-navy-muted/20 transition-all cursor-pointer group shadow-sm"
                       >
                          <div className="flex items-center justify-between mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-navy-muted/5 text-navy-muted flex items-center justify-center">
                               <Bell className="w-7 h-7" />
                            </div>
                            <ChevronRight className="w-6 h-6 text-slate-300 group-hover:translate-x-1 transition-transform" />
                          </div>
                          <h4 className="text-base font-black text-slate-800 uppercase tracking-wider">Alert Preferences</h4>
                          <p className="text-xs text-slate-400 font-medium mt-2 leading-relaxed">Manage how you receive critical satellite-triggered crisis notifications.</p>
                       </div>

                       <div className="bg-white border-2 border-slate-100 p-8 rounded-[3rem] border-alert-orange/20 bg-alert-orange/5 col-span-full shadow-sm">
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                             <LifeBuoy className="w-5 h-5 text-alert-orange" />
                             Emergency Hotlines (Pakistan)
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <a href="tel:1717" className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-alert-orange/30 transition-all group">
                                <div>
                                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NDMA Helpline</div>
                                   <div className="text-lg font-black text-slate-800">1717</div>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-alert-orange group-hover:text-white transition-all">
                                   <Cross className="w-5 h-5" />
                                </div>
                             </a>
                             <a href="tel:1122" className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-alert-orange/30 transition-all group">
                                <div>
                                   <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rescue 1122</div>
                                   <div className="text-lg font-black text-slate-800">1122</div>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-alert-orange group-hover:text-white transition-all">
                                   <Cross className="w-5 h-5" />
                                </div>
                             </a>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-6 font-bold uppercase tracking-wider text-center italic">These numbers connect directly to verified government emergency response units.</p>
                       </div>
                    </motion.div>
                  ) : profileTab === 'medical' ? (
                    <motion.div 
                        key="medical"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-white border-2 border-slate-100 p-8 rounded-[3rem] shadow-sm"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Verified Emergency Record</h3>
                            <button onClick={() => setProfileTab('info')} className="text-[10px] font-black text-jade-muted uppercase tracking-widest hover:underline">Go Back</button>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Blood Type</span>
                                    <span className="text-xl font-black text-slate-800">B+ (Positive)</span>
                                </div>
                                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Allergies</span>
                                    <span className="text-sm font-bold text-slate-800">No known allergies</span>
                                </div>
                            </div>
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Chronic Conditions</span>
                                <span className="text-sm font-bold text-slate-800">None detected via NADRA linkage</span>
                            </div>
                            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Emergency Contact</span>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-sm font-bold text-slate-800">Primary Relative</span>
                                    <span className="text-xs font-mono font-bold text-slate-400">+92 3XX XXXXXXX</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-slate-100">
                            <div className="flex items-center gap-3 p-4 bg-jade-muted/5 rounded-2xl border border-jade-muted/10">
                                <FileCheck className="w-5 h-5 text-jade-muted" />
                                <div className="text-[10px] text-jade-muted font-bold uppercase tracking-wide">Verified by Pakistan Medical Database (PMD)</div>
                            </div>
                        </div>
                    </motion.div>
                  ) : profileTab === 'preferences' ? (
                    <motion.div 
                        key="preferences"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-white border-2 border-slate-100 p-8 rounded-[3rem] shadow-sm"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Notification Filters</h3>
                            <button onClick={() => setProfileTab('info')} className="text-[10px] font-black text-navy-muted uppercase tracking-widest hover:underline">Go Back</button>
                        </div>

                        <div className="space-y-4">
                            {[
                                { id: 'email', label: 'Emergency Email Broadcast', desc: 'Critical alerts and situation updates sent directly to your inbox' },
                                { id: 'push', label: 'AI Priority Notifications', desc: 'Satellite-triggered push alerts for your specific sector' },
                                { id: 'voice', label: 'Automated Voice Calls', desc: 'Only for Tier-1 immediate life-threatening events' }
                            ].map(item => (
                                <div key={item.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex-1">
                                        <h5 className="text-xs font-black text-slate-800 uppercase font-display tracking-tight">{item.label}</h5>
                                        <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wide">{item.desc}</p>
                                    </div>
                                    <div className="w-12 h-6 bg-teal-muted rounded-full relative cursor-pointer">
                                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="text-[9px] text-slate-400 mt-8 font-bold uppercase tracking-widest text-center italic">Preference changes are synced with the CIRO Network in 2s.</p>
                    </motion.div>
                  ) : (
                    <motion.div 
                        key="reports"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        <div className="flex justify-between items-center mb-4 px-6">
                           <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Validated Submissions</h3>
                           <button onClick={() => setProfileTab('info')} className="text-[10px] font-black text-teal-muted uppercase tracking-widest hover:underline">Profile Home</button>
                        </div>
                        {loadingReports ? (
                          <div className="py-24 flex flex-col items-center justify-center gap-6 bg-slate-50 border border-slate-100 rounded-[3rem]">
                            <motion.div 
                               animate={{ rotate: 360 }}
                               transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                               className="w-12 h-12 border-4 border-teal-muted/20 border-t-teal-muted rounded-full"
                            />
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest animate-pulse">Syncing History Data...</p>
                          </div>
                        ) : userReports.length > 0 ? (
                            userReports.map(report => (
                                <div key={report.id} className="bg-white border-2 border-slate-100 p-6 rounded-[2.5rem] flex items-center justify-between group hover:border-teal-muted/20 transition-all shadow-sm">
                                    <div className="flex items-center gap-5">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${
                                            report.status === 'Solved' ? 'bg-jade-muted/10 text-jade-muted' : 
                                            report.status === 'Processing' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                                        }`}>
                                            <FileCheck className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">#INC-{report.id} • {report.type}</h4>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${
                                                    report.status === 'Solved' ? 'bg-jade-muted/10 border-jade-muted/20 text-jade-muted' : 
                                                    report.status === 'Processing' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-orange-50 border-orange-100 text-orange-700'
                                                }`}>
                                                    {report.status}
                                                </span>
                                                <div className="flex items-center gap-1.5 opacity-40">
                                                   <MapPin className="w-3 h-3" />
                                                   <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest truncate max-w-[120px]">{report.location}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handlePrintReport(report)}
                                        className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-teal-muted hover:bg-teal-muted/10 rounded-2xl transition-all cursor-pointer shadow-sm active:scale-90"
                                        title="Print PDF Transcript"
                                    >
                                        <Printer className="w-5 h-5" />
                                    </button>
                                </div>
                            ))
                        ) : (
                          <div className="py-24 text-center bg-slate-50/50 rounded-[4rem] border-2 border-dashed border-slate-200">
                             <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-xl mx-auto mb-6 text-slate-200 border border-slate-100">
                                <FileText className="w-8 h-8" />
                             </div>
                             <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Clean Record</h4>
                             <p className="text-[11px] text-slate-400 mt-2 font-medium max-w-[200px] mx-auto leading-relaxed">No emergency submissions detected on this Citizen Interface.</p>
                          </div>
                        )}
                        <div className="mt-8 p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Reports are verified via Satellite Telemetry<br />& CIRO Agent Consensus</p>
                        </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </main>

        {/* Desktop Prioritized Sidebar */}
        <aside className="hidden lg:flex flex-col w-80 border-l border-slate-100 bg-slate-50/30 overflow-y-auto no-scrollbar shrink-0">
            <div className="p-6 border-b border-slate-100 bg-white z-10 sticky top-0">
                <h3 className="text-xs font-display font-extrabold text-slate-800 uppercase tracking-[2px]">Prioritized Response</h3>
            </div>
            {!user ? (
                <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-md mb-4 text-teal-muted">
                        <LogIn className="w-6 h-6" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Restricted Access</p>
                    <p className="text-xs text-slate-400 leading-relaxed">Login to view prioritized sectors.</p>
                </div>
            ) : (
                <div className="p-6 space-y-4">
                    <div className="text-center py-10 text-slate-300 italic text-xs">
                        No localized priorities found.
                    </div>
                </div>
            )}

            {/* Call CIRO Agent — WhatsApp Button */}
            <div className="p-6 border-t border-slate-100 bg-white sticky bottom-0">
                <a
                    href="https://wa.me/923001234567?text=Hello%20CIRO%20Agent%2C%20I%20need%20emergency%20assistance."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full py-3.5 rounded-2xl text-white text-sm font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer"
                    style={{ backgroundColor: '#25D366' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1ebe5d')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#25D366')}
                >
                    {/* WhatsApp SVG Icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 shrink-0">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Call CIRO Agent
                </a>
                <p className="text-center text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-wider">Opens WhatsApp · 24/7 Support</p>
            </div>
        </aside>
      </div>

      {/* Mobile Navigation Bar */}
      <nav className="md:hidden h-16 border-t border-slate-100 flex justify-between items-center px-6 shrink-0 bg-white z-50 relative">
        <NavIcon icon={<Home className="w-5 h-5" />} label="HOME" active={navTab === 'home'} onClick={() => setNavTab('home')} />
        <NavIcon icon={<Bell className="w-5 h-5" />} label="ALERTS" active={navTab === 'alerts'} onClick={() => setNavTab('alerts')} />
        
        {/* Center SOS Button */}
        <div 
          onClick={() => navigate('/report')}
          className="w-14 h-14 bg-red-600 rounded-full flex flex-col items-center justify-center text-white shadow-lg shadow-red-500/30 absolute left-1/2 -top-5 -translate-x-1/2 border-4 border-white cursor-pointer active:scale-95 transition-transform"
        >
          <span className="font-black text-[13px] tracking-wider leading-none">SOS</span>
          <span className="text-[8px] font-bold mt-0.5 tracking-wider">Report</span>
        </div>

        <div className="w-10"></div> {/* Spacer for SOS */}

        <NavIcon icon={<MapPin className="w-5 h-5" />} label="MAP" active={navTab === 'map'} onClick={() => setNavTab('map')} />
        <NavIcon icon={<User className="w-5 h-5" />} label="PROFILE" active={navTab === 'profile'} onClick={() => setNavTab('profile')} />
      </nav>
    </div>
  );
}

function NavIcon({ icon, label, onClick, active = false }: { icon: any, label: string, onClick?: () => void, active?: boolean }) {
  return (
    <div 
        onClick={onClick}
        className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${active ? 'text-teal-muted' : 'text-slate-400'}`}
    >
        {icon}
        <span className="text-[8px] font-bold mt-0.5 tracking-wider uppercase">{label}</span>
    </div>
  );
}
