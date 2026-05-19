import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Bell, ShieldAlert, CheckCircle2, Info, AlertTriangle, LifeBuoy } from 'lucide-react';

export default function AlertDetail() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const alert = state?.alert;

  if (!alert) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <Info className="w-10 h-10 text-slate-300" />
        </div>
        <h1 className="text-xl font-display font-black text-slate-800 uppercase tracking-tight">Alert Not Found</h1>
        <p className="text-sm text-slate-500 mt-2 mb-8">This alert may have expired or is no longer available.</p>
        <button 
          onClick={() => navigate('/')}
          className="px-8 py-4 bg-teal-muted text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg"
        >
          Return Home
        </button>
      </div>
    );
  }

  const hasStrategy = alert.prepTips && Array.isArray(alert.prepTips) && alert.prepTips.length > 0;
  const hasWorstCase = alert.worstCase && typeof alert.worstCase === 'string' && alert.worstCase.trim().length > 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header Section */}
      <header className={`p-6 pt-10 pb-20 text-white relative overflow-hidden ${
        alert.severity === 'High' ? 'bg-alert-orange' : 
        alert.severity === 'Moderate' ? 'bg-teal-muted' : 'bg-slate-700'
      }`}>
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[120px] -mr-48 -mt-48 rounded-full"></div>
        
        <div className="max-w-4xl mx-auto w-full relative z-10">
          <motion.button 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="w-12 h-12 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-2xl flex items-center justify-center transition-all active:scale-90 mb-10"
          >
            <ArrowLeft className="w-6 h-6" />
          </motion.button>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-6"
          >
            <span className="text-[10px] font-black uppercase bg-white/20 px-4 py-1.5 rounded-full border border-white/30 tracking-[0.2em]">
              {alert.type || 'Alert'}
            </span>
            <span className="text-[10px] font-black uppercase bg-black/10 px-4 py-1.5 rounded-full border border-black/5 tracking-[0.2em] opacity-80 text-white/90">
              {alert.time}
            </span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl font-display font-black leading-[1.1] uppercase tracking-tight max-w-2xl"
          >
            {alert.title}
          </motion.h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 -mt-12 bg-white rounded-t-[4rem] px-6 py-12 lg:px-12 relative z-20 shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.1)]">
        <div className="max-w-4xl mx-auto w-full pb-24">
          
          {/* Situation Brief */}
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${alert.severity === 'High' ? 'bg-red-500' : 'bg-teal-500'}`}></div>
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Situation Analysis</h2>
            </div>
            <div className="bg-slate-50/50 p-8 sm:p-12 rounded-[3.5rem] border border-slate-100/80 relative group">
              <div className="absolute top-6 right-8 text-slate-100 opacity-20 transform scale-[5] origin-top-right select-none">
                <Bell size={120} />
              </div>
              <p className="text-xl sm:text-2xl text-slate-800 font-medium leading-relaxed relative z-10 italic">
                "{alert.description}"
              </p>
            </div>
          </section>

          {/* Grid: Worst Case & Source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {/* Worst Case */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className={`p-10 rounded-[3rem] flex flex-col border ${hasWorstCase ? 'bg-red-50 border-red-100/50' : 'bg-slate-50 border-slate-100'}`}
            >
              <div className="flex items-center gap-4 mb-8">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${hasWorstCase ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'}`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className={`text-xs font-black uppercase tracking-widest ${hasWorstCase ? 'text-red-700' : 'text-slate-500'}`}>Worst Case Scenario</h3>
              </div>
              <p className={`text-base font-bold leading-relaxed flex-1 ${hasWorstCase ? 'text-red-900' : 'text-slate-600'}`}>
                {hasWorstCase ? alert.worstCase : "Atmospheric conditions indicate moderate impact. No extreme escalation predicted at this time."}
              </p>
            </motion.section>

            {/* Source Info */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="p-10 bg-teal-muted/5 border border-teal-muted/10 rounded-[3rem] flex flex-col"
            >
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-teal-muted/10 text-teal-muted rounded-2xl flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-widest text-teal-muted">Data Authentication</h3>
              </div>
              <p className="text-base font-bold text-slate-700 leading-relaxed flex-1">
                Verified incident data provided by <span className="text-teal-muted underline underline-offset-4">{alert.source || 'Standard CIRO Protocols'}</span>.
              </p>
              <div className="mt-8 pt-6 border-t border-teal-muted/10 flex items-center gap-3">
                <div className="w-5 h-5 bg-teal-muted rounded-full flex items-center justify-center shadow-lg shadow-teal-muted/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-[10px] font-black uppercase text-teal-muted tracking-widest">NDMA/PMD Ground Truth</span>
              </div>
            </motion.section>
          </div>

          {/* Strategies: Call to Action */}
          <section className="bg-slate-900 rounded-[4rem] shadow-[-20px_40px_80px_-20px_rgba(15,23,42,0.3)] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-muted/10 to-transparent"></div>
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-muted/5 blur-[100px] -mb-40 -mr-40"></div>
            
            <div className="p-10 lg:p-16 relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 mb-12 border-b border-white/10 pb-10">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-teal-muted rounded-3xl flex items-center justify-center shadow-2xl shadow-teal-muted/40">
                    <LifeBuoy className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-tight">Active Preparation</h3>
                    <p className="text-[11px] font-bold text-teal-muted uppercase tracking-[0.2em] mt-1.5 opacity-80">Safety Protocols & Coping Strategy</p>
                  </div>
                </div>
              </div>

              {hasStrategy ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
                  {alert.prepTips.map((tip: string, i: number) => (
                    <motion.div 
                      key={i} 
                      whileHover={{ scale: 1.02 }}
                      className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex gap-5 group transition-all"
                    >
                      <span className="text-teal-muted font-black text-lg italic opacity-40 group-hover:opacity-100 transition-opacity">0{i+1}</span>
                      <p className="text-white/90 text-sm sm:text-base font-semibold leading-relaxed">{tip}</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] text-center border-dashed">
                   <p className="text-white/100 text-lg font-medium italic mb-2">"Visibility remains the priority."</p>
                   <p className="text-white/60 text-sm leading-relaxed max-w-md mx-auto">Standard safety guidelines apply: Keep devices charged, monitor the live map for updates, and avoid unnecessary travel.</p>
                </div>
              )}
            </div>
          </section>

          {/* Dismiss Action */}
          <div className="mt-20 pt-10 border-t border-slate-100 flex flex-col items-center">
             <button 
                onClick={() => navigate('/')}
                className="group flex flex-col items-center gap-4 transition-all"
             >
                <div className="w-16 h-16 bg-white group-hover:bg-slate-900 group-hover:text-white rounded-full flex items-center justify-center transition-all group-active:scale-90 border-2 border-slate-100 group-hover:border-slate-900 shadow-sm group-hover:shadow-xl">
                    <ArrowLeft className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-900 uppercase tracking-[0.3em] transition-colors">Return to Dashboard</span>
             </button>
          </div>

        </div>
      </main>
    </div>
  );
}

