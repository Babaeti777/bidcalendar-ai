import React, { useState } from 'react';
import { FileText, ArrowLeft } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { FullProjectData, DEFAULT_LEAD_TIMES } from '../types';
import { calculateInternalEvents } from '../utils/calendar';

interface ManualEntryFormProps {
  onBack: () => void;
}

export const ManualEntryForm: React.FC<ManualEntryFormProps> = ({ onBack }) => {
  const { theme, setData, setStatus, leadTimeSettings, addAuditLog } = useAppStore();
  const isDark = theme === 'dark';

  const [formData, setFormData] = useState({
    projectName: '',
    agencyName: '',
    projectAddress: '',
    projectDescription: '',
    bidDueDate: '',
    rfiDueDate: '',
    siteVisitDate: '',
    isSiteVisitMandatory: false,
    rsvpDeadline: '',
    bidBondRequirement: '',
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const extractedData = {
      projectName: formData.projectName,
      agencyName: formData.agencyName,
      projectAddress: formData.projectAddress,
      projectDescription: formData.projectDescription || undefined,
      bidDueDate: formData.bidDueDate ? new Date(formData.bidDueDate).toISOString() : null,
      rfiDueDate: formData.rfiDueDate ? new Date(formData.rfiDueDate).toISOString() : null,
      siteVisitDate: formData.siteVisitDate ? new Date(formData.siteVisitDate).toISOString() : null,
      isSiteVisitMandatory: formData.isSiteVisitMandatory,
      rsvpDeadline: formData.rsvpDeadline ? new Date(formData.rsvpDeadline).toISOString() : null,
      bidBondRequirement: formData.bidBondRequirement || null,
    };

    const fullData = calculateInternalEvents(extractedData, leadTimeSettings) as FullProjectData;

    setData(fullData);
    setStatus('review');

    addAuditLog({
      action: 'upload',
      details: { method: 'manual', projectName: formData.projectName },
    });
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${isDark ? '#374151' : '#d1d5db'}`,
    borderRadius: '8px',
    fontSize: '0.95rem',
    background: isDark ? '#111827' : '#fff',
    color: isDark ? '#f9fafb' : '#111827',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: '600' as const,
    color: isDark ? '#9ca3af' : '#374151',
    marginBottom: '6px',
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'none',
          border: 'none',
          color: isDark ? '#9ca3af' : '#6b7280',
          cursor: 'pointer',
          marginBottom: '24px',
          padding: '8px 0',
          fontSize: '0.9rem',
        }}
      >
        <ArrowLeft size={18} /> Back to upload
      </button>

      <div
        style={{
          background: isDark ? '#1f2937' : '#fff',
          borderRadius: '16px',
          border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            background: isDark ? '#111827' : '#f9fafb',
            borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          }}
        >
          <h2
            style={{
              fontSize: '1.1rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: isDark ? '#f9fafb' : '#111827',
            }}
          >
            <FileText size={20} color="#2563eb" /> Manual Bid Entry
          </h2>
          <p style={{ fontSize: '0.85rem', color: isDark ? '#9ca3af' : '#6b7280', marginTop: '4px' }}>
            Enter bid details manually when AI extraction isn't available
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label>
                <span style={labelStyle}>
                  Project Name <span style={{ color: '#dc2626' }}>*</span>
                </span>
                <input
                  required
                  value={formData.projectName}
                  onChange={(e) => handleChange('projectName', e.target.value)}
                  style={inputStyle}
                  placeholder="e.g. Highway 101 Widening"
                />
              </label>
              <label>
                <span style={labelStyle}>
                  Agency / Owner <span style={{ color: '#dc2626' }}>*</span>
                </span>
                <input
                  required
                  value={formData.agencyName}
                  onChange={(e) => handleChange('agencyName', e.target.value)}
                  style={inputStyle}
                  placeholder="e.g. City of San Francisco"
                />
              </label>
              <label>
                <span style={labelStyle}>Project Address</span>
                <input
                  value={formData.projectAddress}
                  onChange={(e) => handleChange('projectAddress', e.target.value)}
                  style={inputStyle}
                  placeholder="e.g. 123 Main St, San Francisco, CA"
                />
              </label>
              <label>
                <span style={labelStyle}>Project Description</span>
                <textarea
                  value={formData.projectDescription}
                  onChange={(e) => handleChange('projectDescription', e.target.value)}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  rows={3}
                  placeholder="Brief scope of work..."
                />
              </label>
              <label>
                <span style={labelStyle}>Bid Bond Requirement</span>
                <input
                  value={formData.bidBondRequirement}
                  onChange={(e) => handleChange('bidBondRequirement', e.target.value)}
                  style={inputStyle}
                  placeholder="e.g. 5% or $10,000"
                />
              </label>
            </div>

            {/* Right Column - Dates */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label>
                <span style={labelStyle}>
                  Bid Due Date <span style={{ color: '#dc2626' }}>*</span>
                </span>
                <input
                  required
                  type="datetime-local"
                  value={formData.bidDueDate}
                  onChange={(e) => handleChange('bidDueDate', e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label>
                <span style={labelStyle}>RFI Due Date</span>
                <input
                  type="datetime-local"
                  value={formData.rfiDueDate}
                  onChange={(e) => handleChange('rfiDueDate', e.target.value)}
                  style={inputStyle}
                />
              </label>
              <label>
                <span style={labelStyle}>Site Visit Date</span>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="datetime-local"
                    value={formData.siteVisitDate}
                    onChange={(e) => handleChange('siteVisitDate', e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: isDark ? '#374151' : '#f3f4f6',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: `1px solid ${isDark ? '#4b5563' : '#e5e7eb'}`,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.isSiteVisitMandatory}
                      onChange={(e) => handleChange('isSiteVisitMandatory', e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: formData.isSiteVisitMandatory ? '#b91c1c' : isDark ? '#9ca3af' : '#374151',
                      }}
                    >
                      Mandatory
                    </span>
                  </label>
                </div>
              </label>
              <label>
                <span style={labelStyle}>RSVP Deadline</span>
                <input
                  type="datetime-local"
                  value={formData.rsvpDeadline}
                  onChange={(e) => handleChange('rsvpDeadline', e.target.value)}
                  style={inputStyle}
                />
              </label>
            </div>
          </div>

          <div
            style={{
              marginTop: '24px',
              paddingTop: '24px',
              borderTop: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              type="button"
              onClick={onBack}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: `1px solid ${isDark ? '#374151' : '#d1d5db'}`,
                background: 'transparent',
                color: isDark ? '#9ca3af' : '#6b7280',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                border: 'none',
                background: '#2563eb',
                color: '#fff',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Create Bid Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
