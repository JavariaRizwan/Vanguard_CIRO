import { useState, useRef, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, MapPin, Camera, Mic, Info, CheckCircle2, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import MapComponent from '../components/MapComponent';

export default function ReportIncident() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [severity, setSeverity] = useState(50);
  const [description, setDescription] = useState('');
  const [infrastructure, setInfrastructure] = useState<string[]>([]);
  const { state } = useLocation();
  const [incidentType, setIncidentType] = useState(state?.type || 'Accident');
  const [location, setLocation] = useState<[number, number]>([30.3753, 69.3451]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingEvidence, setIsRecordingEvidence] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const evidenceRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const evidenceChunksRef = useRef<Blob[]>([]);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [evidence, setEvidence] = useState<{ type: 'image' | 'video' | 'audio', data: string, name: string, mimeType?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Dynamic States
  const [heatwaveStatus, setHeatwaveStatus] = useState('Medium');
  const [hasDisease, setHasDisease] = useState('No');
  const [diseaseName, setDiseaseName] = useState('');
  const [mitigationAction, setMitigationAction] = useState('Water distribution');
  const [roadAddress, setRoadAddress] = useState('');
  const [roadIncidentOccurred, setRoadIncidentOccurred] = useState('No');
  const [roadIncidentDetails, setRoadIncidentDetails] = useState('');
  const [powerProblemType, setPowerProblemType] = useState('Complete outage of power supply');
  const [powerDuration, setPowerDuration] = useState('');
  const [isVerifyingImage, setIsVerifyingImage] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [customCrisisType, setCustomCrisisType] = useState(state?.customType || '');

  // Health & Accident Flow States
  const [healthIssueType, setHealthIssueType] = useState<'Health/Disease' | 'Accident' | null>(null);
  const [healthSubtype, setHealthSubtype] = useState<'Health' | 'Disease Spike' | null>(null);
  const [medicalProblem, setMedicalProblem] = useState('');
  const [illnessDuration, setIllnessDuration] = useState('');
  const [immediateAction, setImmediateAction] = useState('Ambulance');
  const [diseaseDuration, setDiseaseDuration] = useState('');
  const [diseaseNameHealth, setDiseaseNameHealth] = useState('');
  const [affectedCount, setAffectedCount] = useState('');
  const [accidentType, setAccidentType] = useState('');
  const [accidentLocation, setAccidentLocation] = useState('');
  const [accidentTime, setAccidentTime] = useState('');
  const [injuredCount, setInjuredCount] = useState('');

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setIsProcessingVoice(true);
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          try {
            const res = await fetch('/api/voice-autofill', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioData: base64Audio, mimeType: 'audio/webm' })
            });
            
            if (!res.ok) {
              const errData = await res.json().catch(() => ({ error: 'Processing failed' }));
              throw new Error(errData.error || `HTTP ${res.status}`);
            }

            const data = await res.json();
            console.log('Voice autofill raw response:', data);
            
            // Strictly check for name and description
            if (data.name && data.name.trim() !== '') {
                setGuestName(data.name.trim());
            }
            if (data.description && data.description.trim() !== '') {
                setDescription(data.description.trim());
            }
          } catch (err) {
            console.error('Voice autofill error:', err);
            alert('Voice processing failed. Please enter details manually.');
          } finally {
            setIsProcessingVoice(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      if (err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        alert('Microphone permission denied. Please allow microphone access in your browser settings or try opening the app in a new tab.');
      } else {
        alert('Microphone access could not be established. Ensure you have a working microphone.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const startEvidenceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      evidenceRecorderRef.current = mediaRecorder;
      evidenceChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) evidenceChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(evidenceChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          setEvidence({
            type: 'audio',
            data: reader.result as string,
            name: `voice_note_${new Date().getTime()}.webm`
          });
        };
      };

      mediaRecorder.start();
      setIsRecordingEvidence(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      if (err instanceof Error && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        alert('Microphone permission denied. Please allow microphone access in your browser settings or try opening the app in a new tab.');
      } else {
        alert('Microphone access could not be established. Ensure you have a working microphone.');
      }
    }
  };

  const stopEvidenceRecording = () => {
    if (evidenceRecorderRef.current && isRecordingEvidence) {
      evidenceRecorderRef.current.stop();
      setIsRecordingEvidence(false);
      evidenceRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        setEvidence({
          type: file.type.startsWith('image/') ? 'image' : 'video',
          data: reader.result as string,
          name: file.name,
          mimeType: file.type
        });

        // AI Verification for Road Blockage
        if (incidentType === 'Road Blockage' && file.type.startsWith('image/')) {
          setIsVerifyingImage(true);
          setVerificationError(null);
          try {
            const res = await fetch('/api/verify-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imageData: base64Data, mimeType: file.type })
            });
            const data = await res.json();
            if (!data.authentic) {
              setVerificationError(`AI Verification Failed: ${data.reason}`);
            }
          } catch (err) {
            console.error('Verification error:', err);
          } finally {
            setIsVerifyingImage(false);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const auth = localStorage.getItem('ciro_auth');
  const user = auth ? JSON.parse(auth).user : null;

  const infrastructureOptions = ['Roads', 'Power Lines', 'Buildings', 'Water Supply', 'Sewerage', 'Telecom'];
  const incidentTypes = [
    { id: 'Accident', icon: '🚗', label: 'Accident' },
    { id: 'Urban Flooding', icon: '🌊', label: 'Urban Flooding' },
    { id: 'Heatwave', icon: '☀️', label: 'Heatwave' },
    { id: 'Road Blockage', icon: '🚧', label: 'Road Blockage' },
    { id: 'Power Outage', icon: '🔌', label: 'Power Outage' },
    { id: 'Other', icon: '📝', label: 'Other' }
  ];

  const handleToggleInfra = (opt: string) => {
    setInfrastructure(prev => 
      prev.includes(opt) ? prev.filter(i => i !== opt) : [...prev, opt]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: incidentType === 'Other' ? (customCrisisType || 'Other') : (incidentType === 'Health & Accident' ? (healthIssueType === 'Accident' ? 'Accident' : (healthSubtype === 'Disease Spike' ? 'Disease Spike' : 'Health')) : incidentType),
          severity: severity > 70 ? 'Critical' : severity > 40 ? 'Medium' : 'Low',
          infrastructure,
          coordinates: location,
          details: description,
          evidence: evidence ? { type: evidence.type, data: evidence.data, name: evidence.name } : null,
          reporter: user ? { name: user.name, type: 'verified' } : { name: guestName, type: 'guest' },
          metadata: { imei: 'sim-12345', device: 'Smartphone' },
          citizenId: user?.citizenId,
          // Specific Fields
          heatwaveDetails: incidentType === 'Heatwave' ? {
            area_location: roadAddress,
            heatwave_status: heatwaveStatus,
            has_disease: hasDisease === 'Yes',
            disease_name: diseaseName,
            mitigation_required: [mitigationAction]
          } : null,
          roadBlockageDetails: incidentType === 'Road Blockage' ? {
            blockage_location: roadAddress,
            incident_occurred: roadIncidentOccurred === 'Yes',
            blockage_details: roadIncidentDetails
          } : null,
          powerOutageDetails: incidentType === 'Power Outage' ? {
            voltage_problem: powerProblemType,
            duration_hours: parseInt(powerDuration)
          } : null,
          healthDetails: (incidentType === 'Health & Accident' && healthSubtype === 'Health') ? {
            medical_problem: medicalProblem,
            illness_duration: illnessDuration,
            immediate_action: immediateAction
          } : null,
          diseaseSpikeDetails: (incidentType === 'Health & Accident' && healthSubtype === 'Disease Spike') ? {
            disease_name: diseaseNameHealth,
            spike_duration: diseaseDuration,
            people_affected: parseInt(affectedCount)
          } : null,
          accidentDetails: (incidentType === 'Health & Accident' && healthIssueType === 'Accident') ? {
            accident_type: accidentType,
            accident_location: accidentLocation,
            accident_time: accidentTime,
            injured_count: parseInt(injuredCount)
          } : null
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Unknown server error' }));
        throw new Error(errData.error || `Server returned ${res.status}`);
      }

      setIsSuccess(true);
      setTimeout(() => {
        if (!user) {
            navigate('/onboarding');
        } else {
            navigate('/');
        }
      }, 4500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityLabel = (val: number) => {
    if (val < 33) return { label: 'Low', color: 'text-green-600', bg: 'bg-green-100' };
    if (val < 66) return { label: 'Medium', color: 'text-orange-500', bg: 'bg-orange-100' };
    return { label: 'Critical', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const severityInfo = getSeverityLabel(severity);

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden relative">
      {/* Header */}
      <header className="px-5 py-3 flex items-center bg-white border-b shrink-0">
        <button onClick={() => navigate(-1)} className="mr-4 text-xl text-slate-800 active:scale-90 transition-transform font-bold">
           ←
        </button>
        <h1 className="text-lg font-display font-bold text-slate-800">Submit Emergency Report</h1>
      </header>

      <div className="flex-1 overflow-y-auto pt-6 pb-12 no-scrollbar">
        <div className="max-w-2xl mx-auto px-5">
          {/* Progress bar */}
          <div className="flex gap-1 mb-8">
              <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-teal-muted' : 'bg-slate-100'}`}></div>
              <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-teal-muted' : 'bg-slate-100'}`}></div>
          </div>

          {/* Incident Type Selection */}
          <section className="mb-10">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">CRISIS TYPE</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {incidentTypes.map(type => (
                      <button 
                          key={type.id}
                          onClick={() => setIncidentType(type.id)}
                          className={`flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all active:scale-95 ${
                              incidentType === type.id 
                              ? 'bg-teal-muted/10 border-teal-muted shadow-sm shadow-teal-muted/10' 
                              : 'bg-white border-slate-100 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:border-slate-300'
                          }`}
                      >
                          <span className="text-2xl mb-2">{type.icon}</span>
                          <span className={`text-[9px] font-black uppercase text-center leading-tight tracking-tighter ${incidentType === type.id ? 'text-teal-muted' : 'text-slate-500'}`}>
                              {type.label}
                          </span>
                      </button>
                  ))}
              </div>
          </section>

          {incidentType === 'Other' && (
            <div className="mb-8 p-6 bg-teal-muted/5 rounded-3xl border border-teal-muted/10 space-y-4">
              <div className="flex items-center gap-2">
                 <Info className="w-5 h-5 text-teal-muted" />
                 <span className="text-[12px] font-black text-teal-muted uppercase tracking-wider">Custom Crisis Type</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium italic">Please enter the specific type of crisis/emergency you want to report.</p>
              <input
                type="text"
                value={customCrisisType}
                onChange={(e) => setCustomCrisisType(e.target.value)}
                placeholder="e.g. Earthquake, Gas Leak, Building Collapse"
                className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm focus:ring-4 ring-teal-muted/10 outline-none transition-all shadow-sm font-semibold"
              />
            </div>
          )}

          {/* Personal & Incident Details Section */}
          <section className="mb-8 p-6 bg-teal-muted/5 rounded-3xl border border-teal-muted/10">
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                      <Info className="w-5 h-5 text-teal-muted" />
                      <span className="text-[12px] font-black text-teal-muted uppercase tracking-wider">Crisis Details</span>
                  </div>
                  <button 
                    disabled={isProcessingVoice}
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        isRecording 
                        ? 'bg-alert-orange text-white animate-pulse shadow-lg' 
                        : isProcessingVoice
                        ? 'bg-slate-100 text-slate-400 cursor-wait'
                        : 'bg-teal-muted/10 text-teal-muted border border-teal-muted/20 hover:bg-teal-muted/20 shadow-sm'
                    }`}
                  >
                    {isProcessingVoice ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
                    ) : (
                      <Mic className={`w-3.5 h-3.5 ${isRecording ? 'fill-current' : ''}`} />
                    )}
                    {isRecording ? 'Stop & Sync' : isProcessingVoice ? 'Processing...' : 'Voice Autofill'}
                  </button>
              </div>
              <p className="text-[10px] text-slate-400 mb-6 font-medium italic">Speak your name and incident details in Urdu or English for AI extraction.</p>
              
              <div className="space-y-6">
                  {(incidentType === 'Urban Flooding' || incidentType === 'Accident') && (
                    <>
                        {!user && (
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block mb-2">Full Name</label>
                                <input 
                                    type="text" 
                                    value={guestName}
                                    onChange={(e) => setGuestName(e.target.value)}
                                    className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm focus:ring-4 ring-teal-muted/10 outline-none transition-all shadow-sm"
                                    placeholder="Your full name"
                                />
                            </div>
                        )}

                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block mb-2">General Situation</label>
                            <textarea 
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full p-5 bg-white border border-slate-100 rounded-[2rem] text-sm focus:ring-4 ring-teal-muted/10 outline-none transition-all shadow-sm"
                                placeholder="Briefly describe what you're seeing..."
                            />
                        </div>
                    </>
                  )}

                  {/* Dynamic Fields for Heatwave */}
                  {incidentType === 'Heatwave' && (
                    <div className="pt-4 border-t border-teal-muted/10 space-y-5">
                         <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block mb-2">Area / Location</label>
                            <input 
                                type="text" 
                                value={roadAddress}
                                onChange={(e) => setRoadAddress(e.target.value)}
                                className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none shadow-sm"
                                placeholder="Enter specific area name"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block mb-2">Heatwave Status</label>
                                <select 
                                    value={heatwaveStatus}
                                    onChange={(e) => setHeatwaveStatus(e.target.value)}
                                    className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none shadow-sm"
                                >
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block mb-2">Related Diseases?</label>
                                <select 
                                    value={hasDisease}
                                    onChange={(e) => setHasDisease(e.target.value)}
                                    className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none shadow-sm"
                                >
                                    <option value="No">No</option>
                                    <option value="Yes">Yes</option>
                                </select>
                            </div>
                        </div>
                        {hasDisease === 'Yes' && (
                             <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block mb-2">Name of Disease</label>
                                <input 
                                    type="text" 
                                    value={diseaseName}
                                    onChange={(e) => setDiseaseName(e.target.value)}
                                    className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none shadow-sm"
                                    placeholder="e.g. Heatstroke, Dehydration"
                                />
                            </div>
                        )}
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block mb-2">Mitigation Required</label>
                            <select 
                                value={mitigationAction}
                                onChange={(e) => setMitigationAction(e.target.value)}
                                className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none shadow-sm"
                            >
                                <option value="Water distribution">Water distribution</option>
                                <option value="Cooling center">Cooling center</option>
                                <option value="Medical camp activity">Medical camp activity</option>
                            </select>
                        </div>
                    </div>
                  )}

                  {/* Dynamic Fields for Road Blockage */}
                  {incidentType === 'Road Blockage' && (
                    <div className="pt-4 border-t border-teal-muted/10 space-y-5">
                         <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block mb-2">Location Address</label>
                            <input 
                                type="text" 
                                value={roadAddress}
                                onChange={(e) => setRoadAddress(e.target.value)}
                                className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none shadow-sm"
                                placeholder="Enter exact address"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block mb-2">Has this caused an incident?</label>
                            <select 
                                value={roadIncidentOccurred}
                                onChange={(e) => setRoadIncidentOccurred(e.target.value)}
                                className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none shadow-sm"
                            >
                                <option value="No">No</option>
                                <option value="Yes">Yes</option>
                            </select>
                        </div>
                        {roadIncidentOccurred === 'Yes' && (
                             <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block mb-2">Incident Details</label>
                                <textarea 
                                    rows={2}
                                    value={roadIncidentDetails}
                                    onChange={(e) => setRoadIncidentDetails(e.target.value)}
                                    className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none shadow-sm"
                                    placeholder="Please mention the incident..."
                                />
                            </div>
                        )}
                    </div>
                  )}

                  {/* Dynamic Fields for Health & Accident */}
                  {incidentType === 'Health & Accident' && (
                    <div className="pt-4 border-t border-teal-muted/10 space-y-6">
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">What is the issue?</label>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { id: 'Health/Disease', label: 'Health / Public Disease Spike' },
                                    { id: 'Accident', label: 'Accident Reporting' }
                                ].map(opt => (
                                    <label key={opt.id} className={`flex items-center gap-3 p-4 bg-white border rounded-2xl cursor-pointer transition-all ${healthIssueType === opt.id ? 'border-teal-muted ring-2 ring-teal-muted/10 shadow-sm' : 'border-slate-100 hover:border-teal-muted/30'}`}>
                                        <input 
                                            type="radio" 
                                            name="healthIssueMain" 
                                            value={opt.id}
                                            checked={healthIssueType === opt.id}
                                            onChange={(e) => setHealthIssueType(e.target.value as any)}
                                            className="w-4 h-4 text-teal-muted"
                                        />
                                        <span className="text-sm font-bold text-slate-700">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {healthIssueType === 'Health/Disease' && (
                            <div className="space-y-6 animate-in slide-in-from-top-4 duration-300">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block">Specify Health Issue</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {['Health', 'Disease Spike'].map(opt => (
                                            <button 
                                                key={opt}
                                                type="button"
                                                onClick={() => setHealthSubtype(opt as any)}
                                                className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${healthSubtype === opt ? 'bg-teal-muted text-white border-teal-muted shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {healthSubtype === 'Health' && (
                                    <div className="space-y-4 pt-4 border-t border-slate-50">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block mb-2">Medical Problem</label>
                                            <input 
                                                type="text" 
                                                value={medicalProblem}
                                                onChange={(e) => setMedicalProblem(e.target.value)}
                                                className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none shadow-sm"
                                                placeholder="e.g. Severe chest pain, high fever"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block mb-2">Duration of illness</label>
                                            <input 
                                                type="text" 
                                                value={illnessDuration}
                                                onChange={(e) => setIllnessDuration(e.target.value)}
                                                className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none shadow-sm"
                                                placeholder="e.g. 2 hours, 3 days"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block mb-2">Immediate Action Required</label>
                                            <select 
                                                value={immediateAction}
                                                onChange={(e) => setImmediateAction(e.target.value)}
                                                className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none shadow-sm"
                                            >
                                                <option value="Ambulance">Ambulance</option>
                                                <option value="House treatment">House treatment</option>
                                                <option value="Medical consult">Medical consult</option>
                                                <option value="Emergency evacuation">Emergency evacuation</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {healthSubtype === 'Disease Spike' && (
                                    <div className="space-y-4 pt-4 border-t border-slate-50">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block mb-2">Name of Disease</label>
                                            <input 
                                                type="text" 
                                                value={diseaseNameHealth}
                                                onChange={(e) => setDiseaseNameHealth(e.target.value)}
                                                className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none shadow-sm"
                                                placeholder="e.g. Dengue, Cholera"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block mb-2">Duration of Spike</label>
                                            <input 
                                                type="text" 
                                                value={diseaseDuration}
                                                onChange={(e) => setDiseaseDuration(e.target.value)}
                                                className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none shadow-sm"
                                                placeholder="e.g. Past 48 hours"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block mb-2">How many people affected?</label>
                                            <input 
                                                type="number" 
                                                value={affectedCount}
                                                onChange={(e) => setAffectedCount(e.target.value)}
                                                className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none shadow-sm"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {healthIssueType === 'Accident' && (
                            <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block mb-2">Type of Accident</label>
                                    <input 
                                        type="text" 
                                        value={accidentType}
                                        onChange={(e) => setAccidentType(e.target.value)}
                                        className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none shadow-sm"
                                        placeholder="e.g. Road Traffic Accident, Industrial"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block mb-2">Location of Accident</label>
                                    <input 
                                        type="text" 
                                        value={accidentLocation}
                                        onChange={(e) => setAccidentLocation(e.target.value)}
                                        className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none shadow-sm"
                                        placeholder="Enter specific address"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block mb-2">Time of Accident</label>
                                        <input 
                                            type="time" 
                                            value={accidentTime}
                                            onChange={(e) => setAccidentTime(e.target.value)}
                                            className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block mb-2">How many injured?</label>
                                        <input 
                                            type="number" 
                                            value={injuredCount}
                                            onChange={(e) => setInjuredCount(e.target.value)}
                                            className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none shadow-sm"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                  )}

                  {/* Dynamic Fields for Power Outage */}
                  {incidentType === 'Power Outage' && (
                    <div className="pt-4 border-t border-teal-muted/10 space-y-5">
                        <label className="text-xs font-bold text-slate-700 block">Are you facing a high voltage problem or low voltage problem or power outage problem?</label>
                        <div className="space-y-3">
                            {[
                                'High voltage',
                                'Low voltage',
                                'Complete outage of power supply'
                            ].map(opt => (
                                <label key={opt} className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl cursor-pointer hover:border-teal-muted/30 transition-colors">
                                    <input 
                                        type="radio" 
                                        name="powerProblem" 
                                        value={opt}
                                        checked={powerProblemType === opt}
                                        onChange={(e) => setPowerProblemType(e.target.value)}
                                        className="w-4 h-4 text-teal-muted"
                                    />
                                    <span className="text-sm font-medium text-slate-700">{opt}</span>
                                </label>
                            ))}
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight block mb-2">Duration (Hours)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={powerDuration}
                                    onChange={(e) => setPowerDuration(e.target.value)}
                                    className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm outline-none shadow-sm pr-12"
                                    placeholder="0"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">hrs</span>
                            </div>
                        </div>
                    </div>
                  )}
              </div>
          </section>

          {/* Removed Location, Severity, and Infrastructure as requested */}

          {/* Upload Media Section */}
          <section className="mb-12">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Evidence Upload</label>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*,video/*" 
                className="hidden" 
              />

              <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-6 rounded-3xl flex flex-col items-center gap-2 shadow-xl cursor-pointer active:scale-95 transition-all ${
                        evidence?.type === 'image' || evidence?.type === 'video'
                        ? 'bg-green-600 text-white shadow-green-200'
                        : 'bg-teal-muted text-white shadow-teal-muted/20 hover:shadow-2xl hover:shadow-teal-muted/30'
                    }`}
                  >
                      <Camera className="w-6 h-6" />
                      <span className="text-[10px] font-black uppercase tracking-wider mt-1">
                        {evidence?.type === 'image' || evidence?.type === 'video' ? 'File Attached' : 'Photo/Video'}
                      </span>
                  </button>
                  <button 
                    onClick={isRecordingEvidence ? stopEvidenceRecording : startEvidenceRecording}
                    className={`p-6 rounded-3xl flex flex-col items-center gap-2 shadow-xl cursor-pointer active:scale-95 transition-all ${
                        isRecordingEvidence 
                        ? 'bg-alert-orange text-white animate-pulse shadow-orange-200' 
                        : evidence?.type === 'audio'
                        ? 'bg-green-600 text-white shadow-green-200'
                        : 'bg-teal-muted text-white shadow-teal-muted/20 hover:shadow-2xl hover:shadow-teal-muted/30'
                    }`}
                  >
                      <Mic className={`w-6 h-6 ${isRecordingEvidence ? 'fill-current' : ''}`} />
                      <span className="text-[10px] font-black uppercase tracking-wider mt-1">
                        {isRecordingEvidence ? 'Recording...' : evidence?.type === 'audio' ? 'Voice Recorded' : 'Voice Note'}
                      </span>
                  </button>
              </div>

              <AnimatePresence mode="wait">
                {evidence && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="mt-6 p-4 bg-white border-2 border-slate-100 rounded-[2rem] shadow-lg overflow-hidden"
                    >
                        <div className="flex flex-col gap-4">
                            <div className="relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 min-h-[120px] flex items-center justify-center">
                                {isVerifyingImage && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                                        <div className="w-8 h-8 border-4 border-teal-muted border-t-transparent rounded-full animate-spin mb-2"></div>
                                        <p className="text-[10px] font-black text-teal-muted uppercase tracking-widest">AI Authenticity Check...</p>
                                    </div>
                                )}
                                {verificationError && (
                                    <div className="absolute top-0 left-0 right-0 bg-red-500 text-white p-2 text-[8px] font-black text-center z-20 uppercase tracking-widest">
                                        {verificationError}
                                    </div>
                                )}
                                {evidence.type === 'image' && (
                                    <img src={evidence.data} alt="Evidence Preview" className="w-full h-48 object-cover" />
                                )}
                                {evidence.type === 'video' && (
                                    <video src={evidence.data} controls className="w-full h-48 object-cover" />
                                )}
                                {evidence.type === 'audio' && (
                                    <div className="w-full p-6 flex flex-col items-center gap-4">
                                        <div className="w-12 h-12 bg-teal-muted/10 rounded-full flex items-center justify-center">
                                            <Mic className="w-6 h-6 text-teal-muted" />
                                        </div>
                                        <audio src={evidence.data} controls className="w-full h-10" />
                                    </div>
                                )}
                                <button 
                                    onClick={() => setEvidence(null)}
                                    className="absolute top-3 right-3 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                                >
                                    ×
                                </button>
                            </div>
                            
                            <div className="px-2 pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] font-black text-slate-800 uppercase truncate max-w-[200px] tracking-tight">{evidence.name}</p>
                                        <p className="text-[8px] font-bold text-teal-muted uppercase tracking-[0.2em] mt-0.5">READY FOR UPLOAD</p>
                                    </div>
                                    <div className="px-3 py-1 bg-green-50 rounded-full">
                                        <span className="text-[8px] font-black text-green-600 uppercase tracking-widest">VERIFIED</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
              </AnimatePresence>

              <p className="text-[10px] text-center text-slate-400 mt-5 font-medium italic">Urdu voice notes are processed automatically via Gemini AI.</p>
          </section>

          <div className="shrink-0 mb-10">
            <button 
                disabled={isSubmitting || isSuccess}
                onClick={handleSubmit}
                className={`w-full py-5 rounded-2xl text-white font-black text-sm tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase cursor-pointer shadow-2xl ${
                    isSuccess ? 'bg-green-600 shadow-green-600/30' : 'bg-teal-muted hover:bg-teal-700 shadow-teal-muted/30'
                }`}
            >
                {isSubmitting ? (
                    <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : isSuccess ? (
                    <>
                        <CheckCircle2 className="w-6 h-6" />
                        <span>Report Saved Successfully</span>
                    </>
                ) : (
                    'Submit Community Report'
                )}
            </button>
          </div>
        </div>
      </div>

      {/* Success Overlay */}
      <AnimatePresence>
        {isSuccess && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-teal-green/90 backdrop-blur flex flex-col items-center justify-center z-[100] text-white p-10 text-center"
            >
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 12 }}
                    className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6"
                >
                    <CheckCircle2 className="w-12 h-12 text-teal-green" />
                </motion.div>
                <h3 className="text-2xl font-bold mb-2">Thank You, Citizen!</h3>
                <p className="text-sm opacity-90 leading-relaxed font-medium">Your report has been received and is being verified against satellite GIS data. Live rescue teams have been alerted.</p>
                
                <div className="mt-8 flex gap-3 urdu-text">
                    <p className="text-xl font-bold">آپ کی رپورٹ موصول ہوگئی ہے۔ شکریہ</p>
                </div>

                <div className="mt-12 flex flex-col items-center gap-3">
                    <div className="w-12 h-1 bg-white/20 rounded-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 4.2 }}
                            className="h-full bg-white"
                        />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Redirecting to Dashboard</p>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
