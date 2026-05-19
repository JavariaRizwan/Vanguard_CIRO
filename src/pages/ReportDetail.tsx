import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Printer, CheckCircle2, Clock, Loader2, MapPin, Shield, User, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/incidents/${id}`)
      .then(res => res.json())
      .then(data => {
        setReport(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  const handlePrint = () => {
    if (!report) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFillColor(80, 160, 160); 
    doc.rect(0, 0, 210, 50, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text('CIRO PAKISTAN', 20, 25);
    doc.setFontSize(10);
    doc.text('COMMAND INFRASTRUCTURE RESPONSE OPERATIONS', 20, 35);
    doc.text('OFFICIAL INCIDENT REPORT', 20, 42);
    
    // Body
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(16);
    doc.text(`Incident ID: #INC-${report.id}`, 20, 70);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('REPORT METADATA', 20, 85);
    doc.line(20, 87, 190, 87);
    
    doc.setTextColor(60, 60, 60);
    doc.text(`Status: ${report.status}`, 20, 95);
    doc.text(`Severity: ${report.severity}`, 20, 105);
    doc.text(`Location: ${report.location}`, 20, 115);
    doc.text(`Timestamp: ${report.time}`, 20, 125);
    doc.text(`Reporter: ${report.reporterName || 'Anonymous'}`, 20, 135);
    
    doc.setTextColor(100, 100, 100);
    doc.text('SITUATIONAL DETAILS', 20, 165);
    doc.line(20, 167, 190, 167);
    
    doc.setTextColor(60, 60, 60);
    const splitDetails = doc.splitTextToSize(report.details || 'No additional details provided.', 170);
    doc.text(splitDetails, 20, 175);
    
    doc.setTextColor(100, 100, 100);
    doc.text('AI VERIFICATION & TELEMETRY', 20, 220);
    doc.line(20, 222, 190, 222);
    
    doc.setTextColor(60, 60, 60);
    doc.text(`Satellite Confidence Score: ${(report.confidence * 100).toFixed(0)}%`, 20, 230);
    doc.text(`Verification Status: ${report.verified ? 'VERIFIED' : 'PENDING'}`, 20, 240);
    doc.text(`Infrastructure Impact: ${report.infrastructure}`, 20, 250);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('This document is electronically verified by CIRO Command Center AI.', 105, 280, { align: 'center' });
    doc.text('© 2026 CIRO PAKISTAN', 105, 285, { align: 'center' });
    
    doc.save(`CIRO-Report-${report.id}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-teal-muted animate-spin" />
      </div>
    );
  }

  if (!report || report.error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white p-10 text-center">
        <h2 className="text-2xl font-black text-slate-800 uppercase mb-4">Report Not Found</h2>
        <button onClick={() => navigate(-1)} className="px-6 py-3 bg-teal-muted text-white rounded-2xl font-bold">Go Back</button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      <header className="px-6 py-5 bg-white border-b flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">Report Details</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">ID: #INC-{report.id}</p>
          </div>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-muted text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-teal-100 active:scale-95 transition-all"
        >
          <Printer className="w-4 h-4" />
          Print PDF
        </button>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6 lg:py-10 space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 overflow-hidden relative"
        >
          {/* Status Banner */}
          <div className={`absolute top-0 right-0 px-8 py-2 rounded-bl-3xl text-[10px] font-black uppercase tracking-[0.2em] text-white ${
            report.status === 'Solved' ? 'bg-jade-muted' : report.status === 'Processing' ? 'bg-navy-muted' : 'bg-amber-500'
          }`}>
            {report.status}
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-20 h-20 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner shrink-0">
              <FileText className="w-10 h-10" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Incident Report</h2>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-tight truncate max-w-[200px]">{report.location}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">{report.time}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-slate-50">
             <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                   <Shield className="w-3.5 h-3.5" />
                   <span className="text-[9px] font-black uppercase tracking-widest">Confidence</span>
                </div>
                <div className="text-lg font-black text-slate-800">{(report.confidence * 100).toFixed(0)}% AI Score</div>
             </div>
             <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                   <User className="w-3.5 h-3.5" />
                   <span className="text-[9px] font-black uppercase tracking-widest">Reporter</span>
                </div>
                <div className="text-lg font-black text-slate-800 truncate">{report.reporterName || 'Anonymous'}</div>
             </div>
             <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                   <FileText className="w-3.5 h-3.5" />
                   <span className="text-[9px] font-black uppercase tracking-widest">Infrastructure</span>
                </div>
                <div className="text-lg font-black text-slate-800 truncate">{report.infrastructure || 'N/A'}</div>
             </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100"
        >
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Situational Details</h3>
          <p className="text-sm font-medium text-slate-600 leading-relaxed bg-slate-50/50 p-6 rounded-2xl border border-slate-50 italic">
            "{report.details || 'No additional text description was provided for this incident.'}"
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100"
        >
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Verification Progress</h3>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
               <div className="w-8 h-8 rounded-full bg-jade-muted flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-white" />
               </div>
               <div>
                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Submission Received</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Data packet successfully transmitted to CIRO cluster.</p>
               </div>
            </div>
            <div className="flex items-start gap-4">
               <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${report.verified ? 'bg-jade-muted' : 'bg-navy-muted animate-pulse'}`}>
                  {report.verified ? <CheckCircle2 className="w-5 h-5 text-white" /> : <Loader2 className="w-5 h-5 text-white" />}
               </div>
               <div>
                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Satellite Verification</h4>
                  <p className="text-[10px] text-slate-400 mt-1">{report.verified ? 'Verified via NASA GPM & Sentinel-2 Telemetry.' : 'Verification in progress via satellite cluster sync.'}</p>
               </div>
            </div>
            <div className="flex items-start gap-4 opacity-50">
               <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-slate-400"></div>
               </div>
               <div>
                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Deployment Coordination</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Waiting for sector commander approval for field deployment.</p>
               </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
