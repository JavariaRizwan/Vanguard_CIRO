import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [registeredId, setRegisteredId] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    if (res.ok) {
      const data = await res.json();
      setRegisteredId(data.citizenId);
    }
  };

  if (registeredId) {
    return (
      <div className="flex-1 bg-white p-6 flex flex-col h-full overflow-y-auto no-scrollbar justify-center items-center text-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-teal-muted/5 p-10 rounded-[3rem] border border-teal-muted/10 shadow-2xl shadow-teal-100"
        >
          <div className="w-20 h-20 bg-teal-muted text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
             <ArrowLeft className="w-10 h-10 rotate-180" />
          </div>
          <h1 className="text-2xl font-display font-black text-slate-800 uppercase tracking-tight">Citizen Account Created</h1>
          <p className="text-sm text-slate-500 mt-4 leading-relaxed mb-8">Welcome to the CIRO platform. Please securely store your unique Citizen ID for future logins.</p>
          
          <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-teal-muted/30 mb-10">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Unique Citizen ID</span>
             <span className="text-3xl font-display font-black text-teal-muted tracking-widest">{registeredId}</span>
          </div>

          <button 
            onClick={() => navigate('/login')}
            className="w-full py-5 bg-teal-muted text-white rounded-2xl font-black shadow-xl hover:shadow-2xl transition-all cursor-pointer active:scale-95 uppercase tracking-widest text-sm"
          >
            Proceed to Login
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white p-6 flex flex-col h-full overflow-y-auto no-scrollbar">
      <div className="max-w-md mx-auto w-full flex-grow flex flex-col">
        <button onClick={() => navigate('/login')} className="mb-8 self-start">
          <ArrowLeft className="w-6 h-6 text-slate-400" />
        </button>
        
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-display font-bold text-teal-muted">Register</h1>
          <p className="text-sm text-slate-400 mt-2">Join the CIRO Community</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:border-teal-muted"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:border-teal-muted"
              placeholder="name@example.com"
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

          <button 
            type="submit"
            className="w-full py-4 bg-teal-muted text-white rounded-2xl font-bold shadow-[-10px_10px_25px_-5px_rgba(80,160,160,0.5)] hover:shadow-[-12px_12px_30px_-5px_rgba(80,160,160,0.6)] cursor-pointer active:scale-95 transition-all mt-4"
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
}
