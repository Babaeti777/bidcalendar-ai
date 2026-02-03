import React from 'react';
import { X, Calendar, Mail, Info } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getMilestones, generateGoogleCalendarUrl, generateOutlookCalendarUrl } from '../utils/calendar';

interface BatchSyncModalProps {
  onClose: () => void;
}

export const BatchSyncModal: React.FC<BatchSyncModalProps> = ({ onClose }) => {
  const { theme, data, calendarProvider, setCalendarProvider, exportOptions, addAuditLog } = useAppStore();

  const isDark = theme === 'dark';

  if (!data) return null;

  const milestones = getMilestones(data, exportOptions.includeInternal);

  const getCalendarDesc = () => {
    let desc = `Project: ${data.projectName}\nAgency: ${data.agencyName}`;
    if (data.projectDescription) desc += `\nScope: ${data.projectDescription}`;
    if (data.comments) desc += `\nNotes: ${data.comments}`;
    return desc;
  };

  const handleSync = (milestone: { label: string; date: string | null }) => {
    if (!milestone.date) return;

    const title = `[${milestone.label}] ${data.projectName}`;
    const url =
      calendarProvider === 'google'
        ? generateGoogleCalendarUrl(title, milestone.date, getCalendarDesc(), data.projectAddress)
        : generateOutlookCalendarUrl(title, milestone.date, getCalendarDesc(), data.projectAddress);

    if (url) {
      window.open(url, '_blank');
      addAuditLog({
        action: 'sync',
        details: {
          provider: calendarProvider,
          milestone: milestone.label,
          projectName: data.projectName,
        },
      });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: isDark ? '#1f2937' : '#fff',
          borderRadius: '24px',
          width: '90%',
          maxWidth: '500px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: isDark ? '#f9fafb' : '#111827' }}>
                Batch Calendar Sync
              </h3>
              <p style={{ fontSize: '0.85rem', color: isDark ? '#9ca3af' : '#6b7280', marginTop: '4px' }}>
                Sync project milestones to your professional calendar.
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: isDark ? '#374151' : '#f3f4f6',
                border: 'none',
                cursor: 'pointer',
                color: isDark ? '#9ca3af' : '#6b7280',
                padding: '8px',
                borderRadius: '12px',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Provider Toggle */}
          <div style={{ display: 'flex', background: isDark ? '#111827' : '#f3f4f6', padding: '6px', borderRadius: '12px' }}>
            <button
              onClick={() => setCalendarProvider('outlook')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                background: calendarProvider === 'outlook' ? (isDark ? '#1f2937' : '#fff') : 'transparent',
                color: calendarProvider === 'outlook' ? '#0ea5e9' : isDark ? '#6b7280' : '#9ca3af',
                boxShadow: calendarProvider === 'outlook' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Mail size={16} /> Outlook
            </button>
            <button
              onClick={() => setCalendarProvider('google')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                background: calendarProvider === 'google' ? (isDark ? '#1f2937' : '#fff') : 'transparent',
                color: calendarProvider === 'google' ? '#dc2626' : isDark ? '#6b7280' : '#9ca3af',
                boxShadow: calendarProvider === 'google' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Calendar size={16} /> Google
            </button>
          </div>
        </div>

        {/* Milestones List */}
        <div style={{ padding: '24px', maxHeight: '50vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {milestones.map((m, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                  borderRadius: '14px',
                  background: isDark ? '#111827' : '#f9fafb',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '4px',
                      background: m.color,
                      boxShadow: `0 0 8px ${m.color}44`,
                    }}
                  ></div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: isDark ? '#f9fafb' : '#111827' }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: isDark ? '#6b7280' : '#9ca3af' }}>
                      {new Date(m.date!).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleSync(m)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: calendarProvider === 'google' ? '#dc2626' : '#0ea5e9',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: '700',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '20px 24px',
            background: isDark ? '#111827' : '#f9fafb',
            borderTop: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
          }}
        >
          <Info size={16} color={isDark ? '#6b7280' : '#9ca3af'} />
          <span style={{ fontSize: '0.8rem', color: isDark ? '#6b7280' : '#9ca3af' }}>
            Browser popups must be allowed to open calendar tabs.
          </span>
        </div>
      </div>
    </div>
  );
};
