import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShieldCheck, UserPlus, ArrowRight, Home } from 'lucide-react';

export default function PostReportOnboarding() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 bg-white p-6 flex flex-col h-full overflow-y-auto no-scrollbar font-sans">
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto w-full">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-teal-muted/10 rounded-[2.5rem] flex items-center justify-center mb-8 ring-8 ring-teal-muted/5"
        >
          <ShieldCheck className="w-10 h-10 text-teal-muted" />
        </motion.div>

        <h1 className="text-2xl font-display font-bold text-slate-800 leading-tight">Report Secured & Being Processed</h1>
        <p className="text-sm text-slate-500 mt-3 leading-relaxed px-4">
          Your emergency report has been saved to the database. To track response status and receive priority alerts, consider finalizing your Citizen ID.
        </p>

        <div className="w-full mt-12 space-y-4">
          <button 
            onClick={() => navigate('/register')}
            className="w-full py-4 bg-teal-muted text-white rounded-2xl font-bold font-display shadow-[-10px_10px_30px_-5px_rgba(80,160,160,0.5)] flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <UserPlus className="w-5 h-5" />
            <span>Secure My Account</span>
            <ArrowRight className="w-4 h-4 opacity-50" />
          </button>

          <button 
            onClick={() => navigate('/')}
            className="w-full py-4 bg-white border-2 border-slate-100 text-slate-400 rounded-2xl font-bold font-display hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4 opacity-60" />
            <span>Maybe Later, Go Home</span>
          </button>
        </div>
      </div>

      <div className="mt-auto pt-10 text-center">
        <div className="flex justify-center -space-x-2 mb-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">
               {String.fromCharCode(64 + i)}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[2px]">Joined by 2.4k Citizens this week</p>
      </div>
    </div>
  );
}
