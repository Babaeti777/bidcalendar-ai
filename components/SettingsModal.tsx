import React, { useState, useEffect } from 'react';
import { X, Clock, Shield, Moon, Sun, Monitor, Key, Info } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { DEFAULT_LEAD_TIMES, Theme } from '../types';
import { getCustomApiKey, setCustomApiKey, MODEL_INFO } from '../services/gemini';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const {
    theme,
    setTheme,
    leadTimeSettings,
    setLeadTimeSettings,
    redactionSettings,
    setRedactionSettings,
    recalculateInternalEvents,
    data,
  } = useAppStore();

  const isDark = theme === 'dark';

  // API key state
  const [apiKey, setApiKey] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);

  useEffect(() => {
    const existingKey = getCustomApiKey();
    if (existingKey) {
      setApiKey(existingKey);
    }
  }, []);

  const handleSaveApiKey = () => {
    setCustomApiKey(apiKey.trim());
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  };

  const handleClearApiKey = () => {
    setCustomApiKey('');
    setApiKey('');
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  };

  const handleLeadTimeChange = (key: keyof typeof leadTimeSettings, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      setLeadTimeSettings({ [key]: numValue });
      if (data) {
        recalculateInternalEvents();
      }
    }
  };

  const handleResetLeadTimes = () => {
    setLeadTimeSettings(DEFAULT_LEAD_TIMES);
    if (data) {
      recalculateInternalEvents();
    }
  };

  const leadTimeFields = [
    { key: 'bondRequestDays' as const, label: 'Bond Request', description: 'Days before bid due' },
    { key: 'finalizeBidDays' as const, label: 'Final Bid Prep', description: 'Days before bid due' },
    { key: 'finalizeRfiDays' as const, label: 'Finalize RFIs', description: 'Days before RFI due' },
    { key: 'subcontractorBidDays' as const, label: 'Sub Bids Due', description: 'Days before bid due' },
    { key: 'scopeReviewDays' as const, label: 'Scope Review', description: 'Days before bid due' },
    { key: 'addendumCheckDays' as const, label: 'Addendum Check', description: 'Days before bid due' },
  ];

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
          maxWidth: '600px',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px',
            borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: isDark ? '#f9fafb' : '#111827' }}>
            Settings
          </h3>
          <button
            onClick={onClose}
            style={{
              background: isDark ? '#374151' : '#f3f4f6',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '10px',
              color: isDark ? '#9ca3af' : '#6b7280',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 80px)' }}>
          {/* Theme Section */}
          <div style={{ marginBottom: '32px' }}>
            <h4
              style={{
                fontSize: '0.9rem',
                fontWeight: '700',
                color: isDark ? '#d1d5db' : '#374151',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Moon size={16} /> Appearance
            </h4>
            <div style={{ display: 'flex', gap: '12px' }}>
              {(['light', 'dark', 'system'] as Theme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: `2px solid ${theme === t ? '#2563eb' : isDark ? '#374151' : '#e5e7eb'}`,
                    background: theme === t ? (isDark ? '#1e3a5f' : '#eff6ff') : 'transparent',
                    color: isDark ? '#f9fafb' : '#111827',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                  }}
                >
                  {t === 'light' && <Sun size={20} />}
                  {t === 'dark' && <Moon size={20} />}
                  {t === 'system' && <Monitor size={20} />}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* API Key Section */}
          <div style={{ marginBottom: '32px' }}>
            <h4
              style={{
                fontSize: '0.9rem',
                fontWeight: '700',
                color: isDark ? '#d1d5db' : '#374151',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Key size={16} /> Gemini API Key
            </h4>

            <div
              style={{
                padding: '12px',
                background: isDark ? '#1e3a5f' : '#eff6ff',
                borderRadius: '8px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <Info size={16} style={{ color: isDark ? '#93c5fd' : '#1e40af', flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '0.8rem', color: isDark ? '#93c5fd' : '#1e40af', margin: 0 }}>
                Using <strong>{MODEL_INFO.name}</strong> with free tier limits: {MODEL_INFO.limits.requestsPerMinute} requests/min, {MODEL_INFO.limits.requestsPerDay.toLocaleString()} requests/day.
                Add your own API key to bypass quota issues.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="password"
                placeholder="Enter your Gemini API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: `1px solid ${isDark ? '#374151' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  background: isDark ? '#111827' : '#fff',
                  color: isDark ? '#f9fafb' : '#111827',
                }}
              />
              <button
                onClick={handleSaveApiKey}
                style={{
                  padding: '10px 16px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {apiKeySaved ? 'Saved!' : 'Save'}
              </button>
              {apiKey && (
                <button
                  onClick={handleClearApiKey}
                  style={{
                    padding: '10px 16px',
                    background: isDark ? '#374151' : '#e5e7eb',
                    color: isDark ? '#f9fafb' : '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            <p style={{ fontSize: '0.75rem', color: isDark ? '#6b7280' : '#9ca3af', marginTop: '8px' }}>
              Get a free API key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Google AI Studio</a>. Your key is stored locally in your browser.
            </p>
          </div>

          {/* Lead Times Section */}
          <div style={{ marginBottom: '32px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <h4
                style={{
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  color: isDark ? '#d1d5db' : '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Clock size={16} /> Internal Milestone Lead Times
              </h4>
              <button
                onClick={handleResetLeadTimes}
                style={{
                  fontSize: '0.75rem',
                  color: '#2563eb',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Reset to Defaults
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {leadTimeFields.map((field) => (
                <div key={field.key}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: isDark ? '#9ca3af' : '#6b7280',
                      marginBottom: '6px',
                    }}
                  >
                    {field.label}
                    <span style={{ fontWeight: '400', marginLeft: '4px' }}>({field.description})</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={leadTimeSettings[field.key]}
                    onChange={(e) => handleLeadTimeChange(field.key, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: `1px solid ${isDark ? '#374151' : '#d1d5db'}`,
                      borderRadius: '8px',
                      fontSize: '0.95rem',
                      background: isDark ? '#111827' : '#fff',
                      color: isDark ? '#f9fafb' : '#111827',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Redaction Section */}
          <div>
            <h4
              style={{
                fontSize: '0.9rem',
                fontWeight: '700',
                color: isDark ? '#d1d5db' : '#374151',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Shield size={16} /> Privacy & Redaction
            </h4>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                background: isDark ? '#111827' : '#f9fafb',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={redactionSettings.enabled}
                onChange={(e) => setRedactionSettings({ enabled: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
              />
              <div>
                <div style={{ fontWeight: '600', color: isDark ? '#f9fafb' : '#111827', fontSize: '0.9rem' }}>
                  Enable sensitive data redaction
                </div>
                <div style={{ fontSize: '0.8rem', color: isDark ? '#9ca3af' : '#6b7280', marginTop: '2px' }}>
                  Automatically redact dollar amounts and percentages before AI processing
                </div>
              </div>
            </label>

            {redactionSettings.enabled && (
              <div style={{ marginTop: '12px', padding: '12px', background: isDark ? '#1e3a5f' : '#eff6ff', borderRadius: '8px' }}>
                <p style={{ fontSize: '0.8rem', color: isDark ? '#93c5fd' : '#1e40af' }}>
                  The following patterns will be redacted: dollar amounts ($X,XXX), percentages (X%), and bid bond references.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
