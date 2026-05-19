import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Shield, Lock, User, ArrowRight } from 'lucide-react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('ciro_admin', JSON.stringify(data));
        navigate('/admin/dashboard');
      } else {
        setError('Unauthorized Access. Invalid Credentials.');
      }
    } catch (err) {
      setError('Connection failed. System offline.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Subtle Background pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#50a0a0 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-muted/5 rounded-full blur-[100px] -mr-64 -mt-64"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-sky-muted/5 rounded-full blur-[100px] -ml-64 -mb-64"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-white rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(15,23,42,0.1)] border border-slate-100 overflow-hidden">
          <div className="p-12 text-center bg-white">
            <div className="w-20 h-20 bg-teal-muted rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-teal-muted/20 ring-8 ring-teal-muted/5">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-display font-black text-slate-900 uppercase tracking-tight">CIRO Admin</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3">Advanced Command Infrastructure</p>
          </div>

          <form onSubmit={handleLogin} className="px-12 pb-12 space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-black uppercase tracking-widest text-center"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-4">
              <div className="group">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Identity Token</label>
                <div className="relative">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-muted transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Admin Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-teal-muted/20 focus:border-teal-muted outline-none transition-all font-bold text-slate-800 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="group">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Security Protocol</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-muted transition-colors" />
                  <input 
                    type="password" 
                    placeholder="Secret Key"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-teal-muted/20 focus:border-teal-muted outline-none transition-all font-bold text-slate-800 text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white p-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-teal-muted shadow-xl shadow-slate-900/10 hover:shadow-teal-muted/20 transition-all active:scale-[0.98] disabled:opacity-50 group mt-4 overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="font-black uppercase tracking-widest text-[11px] relative z-10">
                {loading ? 'Authenticating...' : 'Access Command Console'}
              </span>
              {!loading && <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />}
            </button>
            
            <div className="flex flex-col items-center gap-4 mt-8">
               <div className="h-[1px] w-12 bg-slate-100"></div>
               <p className="text-[9px] text-center text-slate-300 font-bold uppercase tracking-[0.25em]">
                 CIRO Core v4.2.1 • Islamabad Sector
               </p>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
