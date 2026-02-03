
import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Calendar, Clock, FileText, CheckCircle, AlertCircle, 
  MapPin, Building, Download, Eye, Sparkles, Send, BrainCircuit, Bot, Mail,
  MessageSquare, ChevronDown, ChevronUp, Settings2, Bell, ExternalLink, CalendarPlus,
  ListChecks, X, Layers, Copy, Check, Info, AlertTriangle
} from 'lucide-react';
import { extractBidInfo, askAssistant, summarizeConversation } from './services/gemini';
import { 
  calculateInternalEvents, generateICS, getBondDeadline, 
  getFinalizeBidDeadline, getFinalizeRfiDeadline, 
  generateGoogleCalendarUrl, generateOutlookCalendarUrl 
} from './utils/calendar';
import { FullProjectData, ProcessingStatus, ExportOptions } from './types';

const App = () => {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [data, setData] = useState<FullProjectData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [showBatchSyncModal, setShowBatchSyncModal] = useState(false);
  const [calendarProvider, setCalendarProvider] = useState<'google' | 'outlook'>('outlook');
  const [activeCalendarPopover, setActiveCalendarPopover] = useState<string | null>(null);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeInternal: true,
    reminders: {
      oneHour: true,
      oneDay: true,
      threeDays: false,
      oneWeek: false
    }
  });
  
  // Chat state
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; text: string; thinking?: boolean }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const calendarPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAssistantThinking]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarPopoverRef.current && !calendarPopoverRef.current.contains(event.target as Node)) {
        setActiveCalendarPopover(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const startProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.random() * 5;
      });
    }, 300);
    return interval;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('uploading');
    setError(null);
    setFileType(file.type);
    const progressInterval = startProgress();

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          setFileBase64(base64);
          
          setStatus('processing');
          const extracted = await extractBidInfo(base64, file.type);
          const fullData = calculateInternalEvents(extracted as any) as FullProjectData;
          
          clearInterval(progressInterval);
          setProgress(100);
          
          setTimeout(() => {
            setData(fullData);
            setStatus('review');
          }, 400);
        } catch (err: any) {
          clearInterval(progressInterval);
          console.error(err);
          const errMsg = err.message || "Failed to analyze document.";
          setError(errMsg);
          setStatus('error');
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError("Error reading file.");
      setStatus('error');
    }
  };

  const handleUpdateField = (field: keyof FullProjectData, value: string | boolean | null) => {
    if (!data) return;
    const newData = { ...data, [field]: value };
    if (field === 'bidDueDate') {
      newData.bondRequestDeadline = getBondDeadline(value as string);
      newData.finalizeBidPackageDeadline = getFinalizeBidDeadline(value as string);
    } else if (field === 'rfiDueDate') {
      newData.finalizeRfiDeadline = getFinalizeRfiDeadline(value as string);
    }
    setData(newData);
  };

  const handleDateChange = (field: keyof FullProjectData, rawValue: string) => {
    if (!rawValue) {
      handleUpdateField(field, null);
      return;
    }
    const d = new Date(rawValue);
    if (!isNaN(d.getTime())) {
      handleUpdateField(field, d.toISOString());
    }
  };

  const handleEmailRSVP = () => {
    if (!data) return;
    const subject = encodeURIComponent(`RSVP: ${data.projectName} - Site Visit`);
    const body = encodeURIComponent(
      `To Whom It May Concern,\n\nI would like to RSVP for the site visit for the project "${data.projectName}" with ${data.agencyName}.\n\nThank you.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || !fileBase64 || isAssistantThinking) return;
    
    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsAssistantThinking(true);
    
    try {
      const response = await askAssistant(userMsg, fileBase64, fileType);
      setChatMessages(prev => [...prev, { role: 'assistant', text: response }]);
    } catch (error) {
      console.error(error);
      setChatMessages(prev => [...prev, { role: 'assistant', text: "Error communicating with AI assistant." }]);
    } finally {
      setIsAssistantThinking(false);
    }
  };

  const handleExportICS = () => {
    if (!data) return;
    const icsContent = generateICS(data, exportOptions);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${data.projectName.replace(/\s+/g, '_')}_schedule.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMilestones = () => {
    if (!data) return [];
    const list = [
      { label: 'Bid Due', date: data.bidDueDate, color: '#dc2626' },
      { label: 'RFI Due', date: data.rfiDueDate, color: '#2563eb' },
      { label: 'Site Visit', date: data.siteVisitDate, color: '#d97706' },
      { label: 'RSVP Deadline', date: data.rsvpDeadline, color: '#4f46e5' },
    ];
    if (exportOptions.includeInternal) {
      if (data.bondRequestDeadline) list.push({ label: 'Bond Request', date: data.bondRequestDeadline, color: '#9333ea' });
      if (data.finalizeRfiDeadline) list.push({ label: 'Finalize RFIs', date: data.finalizeRfiDeadline, color: '#4b5563' });
      if (data.finalizeBidPackageDeadline) list.push({ label: 'Final Prep', date: data.finalizeBidPackageDeadline, color: '#4b5563' });
    }
    return list.filter(m => m.date);
  };

  const getCalendarDesc = () => {
    if (!data) return "";
    let desc = `Project: ${data.projectName}\nAgency: ${data.agencyName}`;
    if (data.projectDescription) desc += `\nScope: ${data.projectDescription}`;
    if (data.comments) desc += `\nNotes: ${data.comments}`;
    return desc;
  };

  const getDaysRemainingBadge = (dateStr: string | null) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    if (isNaN(target.getTime())) return null;
    
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const isPast = diffTime < 0;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let label = '';
    if (isPast) {
        const absDays = Math.floor(Math.abs(diffTime) / (1000 * 60 * 60 * 24));
        label = absDays === 0 ? 'Due Today' : `${absDays} days ago`;
    } else {
        label = diffDays <= 1 ? 'Due Today' : `${diffDays} days left`;
    }

    const color = isPast ? '#b91c1c' : '#4b5563';
    const bg = isPast ? '#fef2f2' : '#f3f4f6';
    
    return (
      <span style={{ 
        fontSize: '0.75rem', 
        fontWeight: '600', 
        color,
        background: bg,
        padding: '2px 8px',
        borderRadius: '99px',
        marginLeft: 'auto',
        whiteSpace: 'nowrap'
      }}>
        {label}
      </span>
    );
  };

  const renderCalendarAction = (field: string, dateStr: string | null, title: string) => {
    if (!dateStr || !data) return null;
    return (
      <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }} ref={activeCalendarPopover === field ? calendarPopoverRef : null}>
        <button
          onClick={() => setActiveCalendarPopover(activeCalendarPopover === field ? null : field)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', padding: '4px', borderRadius: '4px' }}
          className="hover:bg-gray-100"
          title="Add to Calendar"
        >
          <CalendarPlus size={18} />
        </button>
        {activeCalendarPopover === field && (
          <div style={{ 
            position: 'absolute', right: 0, top: '100%', marginTop: '5px', 
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 50, minWidth: '160px',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => {
                const url = generateGoogleCalendarUrl(title, dateStr, getCalendarDesc(), data.projectAddress);
                if (url) window.open(url, '_blank');
                setActiveCalendarPopover(null);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#374151', borderBottom: '1px solid #f3f4f6' }}
            >
               Google Calendar
            </button>
            <button
              onClick={() => {
                const url = generateOutlookCalendarUrl(title, dateStr, getCalendarDesc(), data.projectAddress);
                if (url) window.open(url, '_blank');
                setActiveCalendarPopover(null);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#374151' }}
            >
               Outlook Calendar
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: '#2563eb', padding: '8px', borderRadius: '10px' }}>
            <BrainCircuit color="#fff" size={24} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>BidCalendar AI</h1>
        </div>
      </header>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'start' }}>
          <AlertCircle size={20} style={{ marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: '600' }}>Extraction Error</p>
            <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>{error}</p>
          </div>
        </div>
      )}

      {status === 'idle' && (
        <div style={{ textAlign: 'center', marginTop: '60px' }}>
          <div style={{ border: '2px dashed #e5e7eb', borderRadius: '16px', padding: '80px 40px', position: 'relative', cursor: 'pointer', background: '#fff', transition: 'border-color 0.2s' }}>
            <input 
              ref={fileInputRef}
              type="file" 
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
              onChange={handleFileUpload}
              accept=".pdf,image/*"
            />
            <div style={{ pointerEvents: 'none' }}>
              <div style={{ width: '64px', height: '64px', background: '#eff6ff', color: '#2563eb', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <Upload size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>Drop your bid documents</h3>
              <p style={{ color: '#6b7280', marginTop: '8px' }}>Supports PDF and high-res images of RFPs or ITBs</p>
            </div>
          </div>
        </div>
      )}

      {(status === 'uploading' || status === 'processing') && (
        <div style={{ maxWidth: '500px', margin: '80px auto', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.95rem', fontWeight: '500', color: '#374151' }}>
             <span>{status === 'uploading' ? 'Uploading file...' : 'Deep Thinking Analysis...'}</span>
             <span>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: '10px', background: '#e5e7eb', borderRadius: '5px', overflow: 'hidden' }}>
            <div 
              style={{ height: '100%', background: '#2563eb', width: `${progress}%`, transition: 'width 0.4s ease-out' }}
            />
          </div>
          <p style={{ marginTop: '16px', color: '#6b7280', fontSize: '0.9rem' }}>Gemini 3 Pro is extracting technical dates and scope requirements.</p>
        </div>
      )}

      {status === 'review' && data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ padding: '20px 24px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px', color: '#111827' }}>
                  <FileText size={20} color="#2563eb" /> Project Extracted Data
                </h2>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '99px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={12} /> VERIFIED BY AI
                </div>
              </div>
              
              <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <label>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Project Name</span>
                    <input 
                      value={data.projectName}
                      onChange={(e) => handleUpdateField('projectName', e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem' }}
                    />
                  </label>
                  <label>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Agency / Owner</span>
                    <input 
                      value={data.agencyName}
                      onChange={(e) => handleUpdateField('agencyName', e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem' }}
                    />
                  </label>
                  <label>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Project Address</span>
                    <div style={{ position: 'relative' }}>
                        <input 
                            value={data.projectAddress}
                            onChange={(e) => handleUpdateField('projectAddress', e.target.value)}
                            style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem' }}
                        />
                        <MapPin size={18} style={{ position: 'absolute', left: '10px', top: '12px', color: '#9ca3af' }} />
                    </div>
                  </label>
                  <label>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Project Description / Scope</span>
                    <textarea 
                      value={data.projectDescription || ''}
                      onChange={(e) => handleUpdateField('projectDescription', e.target.value)}
                      rows={4}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem', resize: 'vertical' }}
                      placeholder="High-level scope of work..."
                    />
                  </label>
                  <label>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Bid Bond Required</span>
                    <div style={{ position: 'relative' }}>
                      <input 
                        value={data.bidBondRequirement || ''}
                        onChange={(e) => handleUpdateField('bidBondRequirement', e.target.value)}
                        placeholder="e.g. 5% or $10,000"
                        style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem' }}
                      />
                      <Building size={18} style={{ position: 'absolute', left: '10px', top: '12px', color: '#9ca3af' }} />
                    </div>
                  </label>
                  <label>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Additional Notes</span>
                    <textarea 
                      value={data.comments || ''}
                      onChange={(e) => handleUpdateField('comments', e.target.value)}
                      rows={3}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem', resize: 'none' }}
                      placeholder="Add custom notes for calendar invite..."
                    />
                  </label>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <label>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151' }}>Bid Due Date</span>
                        {getDaysRemainingBadge(data.bidDueDate)}
                    </div>
                    <div style={{ position: 'relative' }}>
                        <input 
                            type="datetime-local"
                            value={data.bidDueDate ? data.bidDueDate.slice(0, 16) : ''}
                            onChange={(e) => handleDateChange('bidDueDate', e.target.value)}
                            style={{ width: '100%', padding: '10px 40px 10px 36px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem' }}
                        />
                        <Clock size={18} style={{ position: 'absolute', left: '10px', top: '12px', color: '#9ca3af' }} />
                        {renderCalendarAction('bidDueDate', data.bidDueDate, `[BID DUE] ${data.projectName}`)}
                    </div>
                  </label>

                  <label>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151' }}>RFI Due Date</span>
                        {getDaysRemainingBadge(data.rfiDueDate)}
                    </div>
                    <div style={{ position: 'relative' }}>
                        <input 
                            type="datetime-local"
                            value={data.rfiDueDate ? data.rfiDueDate.slice(0, 16) : ''}
                            onChange={(e) => handleDateChange('rfiDueDate', e.target.value)}
                            style={{ width: '100%', padding: '10px 40px 10px 36px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem' }}
                        />
                        <CheckCircle size={18} style={{ position: 'absolute', left: '10px', top: '12px', color: '#9ca3af' }} />
                        {renderCalendarAction('rfiDueDate', data.rfiDueDate, `[RFI DUE] ${data.projectName}`)}
                    </div>
                  </label>

                  <label>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151' }}>Site Visit Date</span>
                        {getDaysRemainingBadge(data.siteVisitDate)}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <input 
                                type="datetime-local"
                                value={data.siteVisitDate ? data.siteVisitDate.slice(0, 16) : ''}
                                onChange={(e) => handleDateChange('siteVisitDate', e.target.value)}
                                style={{ width: '100%', padding: '10px 40px 10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem' }}
                            />
                            {renderCalendarAction('siteVisitDate', data.siteVisitDate, `[SITE VISIT] ${data.projectName}`)}
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f3f4f6', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #e5e7eb' }}>
                            <input 
                                type="checkbox"
                                checked={data.isSiteVisitMandatory}
                                onChange={(e) => handleUpdateField('isSiteVisitMandatory', e.target.checked)}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: data.isSiteVisitMandatory ? '#b91c1c' : '#374151' }}>Mandatory</span>
                        </label>
                    </div>
                  </label>

                  <label>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151' }}>RSVP Deadline</span>
                        {getDaysRemainingBadge(data.rsvpDeadline)}
                    </div>
                    <div style={{ position: 'relative' }}>
                        <input 
                            type="datetime-local"
                            value={data.rsvpDeadline ? data.rsvpDeadline.slice(0, 16) : ''}
                            onChange={(e) => handleDateChange('rsvpDeadline', e.target.value)}
                            style={{ width: '100%', padding: '10px 40px 10px 36px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '0.95rem' }}
                        />
                        <Mail size={18} style={{ position: 'absolute', left: '10px', top: '12px', color: '#9ca3af' }} />
                        {renderCalendarAction('rsvpDeadline', data.rsvpDeadline, `[RSVP] ${data.projectName}`)}
                    </div>
                  </label>

                  {/* Internal Deadlines Section */}
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #e5e7eb' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#374151', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ListChecks size={16} color="#6b7280" /> Internal Milestones
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <label>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151' }}>Bond Request Deadline</span>
                                {getDaysRemainingBadge(data.bondRequestDeadline)}
                            </div>
                            <input 
                                type="datetime-local"
                                value={data.bondRequestDeadline ? data.bondRequestDeadline.slice(0, 16) : ''}
                                onChange={(e) => handleDateChange('bondRequestDeadline', e.target.value)}
                                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', background: '#f9fafb' }}
                            />
                        </label>
                        <label>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151' }}>Finalize RFI List</span>
                                {getDaysRemainingBadge(data.finalizeRfiDeadline)}
                            </div>
                            <input 
                                type="datetime-local"
                                value={data.finalizeRfiDeadline ? data.finalizeRfiDeadline.slice(0, 16) : ''}
                                onChange={(e) => handleDateChange('finalizeRfiDeadline', e.target.value)}
                                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', background: '#f9fafb' }}
                            />
                        </label>
                        <label>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151' }}>Final Bid Package Prep</span>
                                {getDaysRemainingBadge(data.finalizeBidPackageDeadline)}
                            </div>
                            <input 
                                type="datetime-local"
                                value={data.finalizeBidPackageDeadline ? data.finalizeBidPackageDeadline.slice(0, 16) : ''}
                                onChange={(e) => handleDateChange('finalizeBidPackageDeadline', e.target.value)}
                                style={{ width: '100%', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '0.9rem', background: '#f9fafb' }}
                            />
                        </label>
                    </div>
                  </div>

                </div>
              </div>

              <div style={{ padding: '0 24px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Bell size={16} color="#6b7280" />
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151' }}>Reminder Settings (ICS Only)</span>
                </div>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                        <input 
                            type="checkbox" 
                            checked={exportOptions.reminders.oneHour}
                            onChange={() => setExportOptions(prev => ({ ...prev, reminders: { ...prev.reminders, oneHour: !prev.reminders.oneHour } }))}
                            style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.9rem', color: '#4b5563' }}>1 Hour</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                        <input 
                            type="checkbox" 
                            checked={exportOptions.reminders.oneDay}
                            onChange={() => setExportOptions(prev => ({ ...prev, reminders: { ...prev.reminders, oneDay: !prev.reminders.oneDay } }))}
                            style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.9rem', color: '#4b5563' }}>1 Day</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                        <input 
                            type="checkbox" 
                            checked={exportOptions.reminders.threeDays}
                            onChange={() => setExportOptions(prev => ({ ...prev, reminders: { ...prev.reminders, threeDays: !prev.reminders.threeDays } }))}
                            style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.9rem', color: '#4b5563' }}>3 Days</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                        <input 
                            type="checkbox" 
                            checked={exportOptions.reminders.oneWeek}
                            onChange={() => setExportOptions(prev => ({ ...prev, reminders: { ...prev.reminders, oneWeek: !prev.reminders.oneWeek } }))}
                            style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.9rem', color: '#4b5563' }}>1 Week</span>
                    </label>
                </div>
              </div>

              <div style={{ padding: '20px 24px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '12px' }}>
                <button 
                  onClick={handleExportICS}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#2563eb', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}
                >
                  <Download size={18} /> Download ICS
                </button>
                <button 
                  onClick={() => setShowBatchSyncModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', color: '#2563eb', border: '1px solid #2563eb', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}
                >
                  <Layers size={18} /> Sync All to Calendar
                </button>
                <button 
                  onClick={handleEmailRSVP}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}
                >
                  <Mail size={18} /> RSVP via Email
                </button>
              </div>
            </div>
          </div>

          {/* AI Assistant Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', height: '620px', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Bot size={20} color="#9333ea" /> Bid AI Assistant
                </h3>
              </div>
              
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {chatMessages.length === 0 && (
                  <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px 20px' }}>
                    <MessageSquare size={32} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                    <p style={{ fontSize: '0.9rem' }}>Ask me about liquidated damages, liquidated quantities, or bonding requirements in the doc.</p>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                    <div key={idx} style={{ 
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '90%',
                        padding: '12px 16px',
                        borderRadius: '14px',
                        background: msg.role === 'user' ? '#2563eb' : '#f3f4f6',
                        color: msg.role === 'user' ? '#fff' : '#111827',
                        fontSize: '0.9rem',
                        lineHeight: '1.5',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                        {msg.text}
                    </div>
                ))}
                {isAssistantThinking && (
                    <div style={{ alignSelf: 'flex-start', background: '#f3f4f6', padding: '12px 16px', borderRadius: '14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div style={{ padding: '20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '10px' }}>
                <input 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="Ask a question..."
                  style={{ flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '0.9rem' }}
                  disabled={isAssistantThinking}
                />
                <button 
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || isAssistantThinking}
                  style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'opacity 0.2s', opacity: (!chatInput.trim() || isAssistantThinking) ? 0.5 : 1 }}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBatchSyncModal && data && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: '24px', width: '90%', maxWidth: '500px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            
            <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                   <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111827' }}>Batch Calendar Sync</h3>
                    <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px' }}>Sync project milestones to your professional calendar.</p>
                   </div>
                   <button onClick={() => setShowBatchSyncModal(false)} style={{ background: '#f3f4f6', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '8px', borderRadius: '12px' }}>
                     <X size={20} />
                   </button>
                </div>
                
                <div style={{ display: 'flex', background: '#f3f4f6', padding: '6px', borderRadius: '12px' }}>
                    <button 
                      onClick={() => setCalendarProvider('outlook')}
                      style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: calendarProvider === 'outlook' ? '#fff' : 'transparent', color: calendarProvider === 'outlook' ? '#0ea5e9' : '#6b7280', boxShadow: calendarProvider === 'outlook' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <Mail size={16} /> Outlook
                    </button>
                    <button 
                      onClick={() => setCalendarProvider('google')}
                      style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: calendarProvider === 'google' ? '#fff' : 'transparent', color: calendarProvider === 'google' ? '#dc2626' : '#6b7280', boxShadow: calendarProvider === 'google' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <Calendar size={16} /> Google
                    </button>
                </div>
            </div>

            <div style={{ padding: '24px', maxHeight: '50vh', overflowY: 'auto' }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 {getMilestones().map((m, i) => (
                   <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '1px solid #e5e7eb', borderRadius: '14px', background: '#f9fafb' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: m.color, boxShadow: `0 0 8px ${m.color}44` }}></div>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#111827' }}>{m.label}</div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{new Date(m.date!).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                            const title = `[${m.label}] ${data.projectName}`;
                            const url = calendarProvider === 'google'
                                ? generateGoogleCalendarUrl(title, m.date, getCalendarDesc(), data.projectAddress)
                                : generateOutlookCalendarUrl(title, m.date, getCalendarDesc(), data.projectAddress);
                            if (url) window.open(url, '_blank');
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: 'none', background: calendarProvider === 'google' ? '#dc2626' : '#0ea5e9', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '700', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                      >
                        Add to {calendarProvider === 'google' ? 'GCal' : 'Outlook'}
                      </button>
                   </div>
                 ))}
               </div>
            </div>
            <div style={{ padding: '20px 24px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Info size={16} color="#6b7280" />
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                Note: Browser popups must be allowed to open calendar tabs.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
