import React from 'react';
import { Download, Layers, Mail, Bell, ExternalLink } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { generateICS } from '../utils/calendar';

interface ExportPanelProps {
  onBatchSync: () => void;
  onPlannerSync: () => void;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ onBatchSync, onPlannerSync }) => {
  const { theme, data, exportOptions, toggleReminder, addAuditLog } = useAppStore();

  const isDark = theme === 'dark';

  if (!data) return null;

  const handleExportICS = () => {
    const icsContent = generateICS(data, exportOptions);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${data.projectName.replace(/\s+/g, '_')}_schedule.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addAuditLog({
      action: 'export',
      details: { format: 'ics', projectName: data.projectName },
    });
  };

  const handleEmailRSVP = () => {
    const subject = encodeURIComponent(`RSVP: ${data.projectName} - Site Visit`);
    const body = encodeURIComponent(
      `To Whom It May Concern,\n\nI would like to RSVP for the site visit for the project "${data.projectName}" with ${data.agencyName}.\n\nThank you.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;

    addAuditLog({
      action: 'export',
      details: { format: 'email_rsvp', projectName: data.projectName },
    });
  };

  return (
    <div
      style={{
        background: isDark ? '#1f2937' : '#fff',
        borderRadius: '16px',
        border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      {/* Reminder Settings */}
      <div style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Bell size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: isDark ? '#9ca3af' : '#374151' }}>
            Reminder Settings (ICS Only)
          </span>
        </div>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {[
            { key: 'oneHour' as const, label: '1 Hour' },
            { key: 'oneDay' as const, label: '1 Day' },
            { key: 'threeDays' as const, label: '3 Days' },
            { key: 'oneWeek' as const, label: '1 Week' },
          ].map(({ key, label }) => (
            <label
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={exportOptions.reminders[key]}
                onChange={() => toggleReminder(key)}
                style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.9rem', color: isDark ? '#9ca3af' : '#4b5563' }}>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Export Buttons */}
      <div
        style={{
          padding: '20px 24px',
          background: isDark ? '#111827' : '#f9fafb',
          borderTop: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={handleExportICS}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          <Download size={18} /> Download ICS
        </button>
        <button
          onClick={onBatchSync}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: isDark ? '#1f2937' : '#fff',
            color: '#2563eb',
            border: '1px solid #2563eb',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          <Layers size={18} /> Sync to Calendar
        </button>
        <button
          onClick={onPlannerSync}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: isDark ? '#1f2937' : '#fff',
            color: '#059669',
            border: '1px solid #059669',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          <ExternalLink size={18} /> Send to Planner
        </button>
        <button
          onClick={handleEmailRSVP}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: isDark ? '#1f2937' : '#fff',
            color: isDark ? '#9ca3af' : '#374151',
            border: `1px solid ${isDark ? '#374151' : '#d1d5db'}`,
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          <Mail size={18} /> RSVP via Email
        </button>
      </div>
    </div>
  );
};
