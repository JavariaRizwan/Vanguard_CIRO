import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn, UserPlus, ArrowLeft } from 'lucide-react';

export default function Login() {
  const [citizenId, setCitizenId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ citizenId, password }),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('ciro_auth', JSON.stringify(data));
      navigate('/');
    } else {
      const data = await res.json();
      setError(data.error || 'Invalid credentials');
    }
  };

  return (
    <div className="flex-1 bg-white p-6 flex flex-col h-full overflow-y-auto no-scrollbar">
      <div className="max-w-md mx-auto w-full flex-grow flex flex-col">
        <button onClick={() => navigate('/')} className="mb-8 self-start">
          <ArrowLeft className="w-6 h-6 text-slate-400" />
        </button>
      
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-display font-bold text-teal-muted">CIRO Pakistan</h1>
        <p className="text-sm text-slate-400 mt-2">Access Secure Reporting Dashboard</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Citizen ID</label>
          <input 
            type="text" 
            value={citizenId}
            onChange={(e) => setCitizenId(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:border-teal-muted"
            placeholder="CI-XXXXXX"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:border-teal-muted"
            placeholder="••••••••"
          />
        </div>
        
        {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}

        <button 
          type="submit"
          className="w-full py-4 bg-teal-muted text-white rounded-2xl font-bold shadow-[-10px_10px_25px_-5px_rgba(80,160,160,0.5)] hover:shadow-[-12px_12px_30px_-5px_rgba(80,160,160,0.6)] cursor-pointer active:scale-95 transition-all"
        >
          Sign In
        </button>
      </form>

        <div className="mt-auto pt-10 text-center">
          <p className="text-xs text-slate-400">Don't have an account?</p>
          <button 
            onClick={() => navigate('/register')}
            className="mt-2 text-sm font-bold text-teal-muted cursor-pointer hover:underline"
          >
            Create New Citizen ID
          </button>
        </div>
      </div>
    </div>
  );
}
