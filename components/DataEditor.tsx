import React, { useRef, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  MapPin,
  Building,
  Clock,
  CheckCircle,
  Mail,
  CalendarPlus,
  ListChecks,
  Users,
  Search,
  FileCheck,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { FullProjectData } from '../types';
import { generateGoogleCalendarUrl, generateOutlookCalendarUrl } from '../utils/calendar';

export const DataEditor: React.FC = () => {
  const {
    theme,
    data,
    updateField,
    activeCalendarPopover,
    setActiveCalendarPopover,
  } = useAppStore();

  const calendarPopoverRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarPopoverRef.current && !calendarPopoverRef.current.contains(event.target as Node)) {
        setActiveCalendarPopover(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setActiveCalendarPopover]);

  if (!data) return null;

  const handleDateChange = (field: keyof FullProjectData, rawValue: string) => {
    if (!rawValue) {
      updateField(field, null);
      return;
    }
    const d = new Date(rawValue);
    if (!isNaN(d.getTime())) {
      updateField(field, d.toISOString());
    }
  };

  const getCalendarDesc = () => {
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

    const color = isPast ? '#b91c1c' : isDark ? '#9ca3af' : '#4b5563';
    const bg = isPast ? (isDark ? '#451a1a' : '#fef2f2') : isDark ? '#374151' : '#f3f4f6';

    return (
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: '600',
          color,
          background: bg,
          padding: '2px 8px',
          borderRadius: '99px',
          marginLeft: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    );
  };

  const renderCalendarAction = (field: string, dateStr: string | null, title: string) => {
    if (!dateStr) return null;
    return (
      <div
        style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}
        ref={activeCalendarPopover === field ? calendarPopoverRef : null}
      >
        <button
          onClick={() => setActiveCalendarPopover(activeCalendarPopover === field ? null : field)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: isDark ? '#9ca3af' : '#6b7280',
            display: 'flex',
            padding: '4px',
            borderRadius: '4px',
          }}
          title="Add to Calendar"
        >
          <CalendarPlus size={18} />
        </button>
        {activeCalendarPopover === field && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '5px',
              background: isDark ? '#1f2937' : '#fff',
              border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              zIndex: 50,
              minWidth: '160px',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => {
                const url = generateGoogleCalendarUrl(title, dateStr, getCalendarDesc(), data.projectAddress);
                if (url) window.open(url, '_blank');
                setActiveCalendarPopover(null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.85rem',
                color: isDark ? '#d1d5db' : '#374151',
                borderBottom: `1px solid ${isDark ? '#374151' : '#f3f4f6'}`,
              }}
            >
              Google Calendar
            </button>
            <button
              onClick={() => {
                const url = generateOutlookCalendarUrl(title, dateStr, getCalendarDesc(), data.projectAddress);
                if (url) window.open(url, '_blank');
                setActiveCalendarPopover(null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.85rem',
                color: isDark ? '#d1d5db' : '#374151',
              }}
            >
              Outlook Calendar
            </button>
          </div>
        )}
      </div>
    );
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

  const inputWithIconStyle = {
    ...inputStyle,
    paddingLeft: '36px',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: isDark ? '#9ca3af' : '#374151',
    marginBottom: '6px',
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
      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          background: isDark ? '#111827' : '#f9fafb',
          borderBottom: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
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
          <FileText size={20} color="#2563eb" /> Project Extracted Data
        </h2>
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: '700',
            background: isDark ? '#064e3b' : '#dcfce7',
            color: isDark ? '#6ee7b7' : '#166534',
            padding: '4px 10px',
            borderRadius: '99px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Sparkles size={12} /> VERIFIED BY AI
        </div>
      </div>

      {/* Form */}
      <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <label>
            <span style={labelStyle}>Project Name</span>
            <input
              value={data.projectName}
              onChange={(e) => updateField('projectName', e.target.value)}
              style={inputStyle}
            />
          </label>
          <label>
            <span style={labelStyle}>Agency / Owner</span>
            <input
              value={data.agencyName}
              onChange={(e) => updateField('agencyName', e.target.value)}
              style={inputStyle}
            />
          </label>
          <label>
            <span style={labelStyle}>Project Address</span>
            <div style={{ position: 'relative' }}>
              <input
                value={data.projectAddress}
                onChange={(e) => updateField('projectAddress', e.target.value)}
                style={inputWithIconStyle}
              />
              <MapPin
                size={18}
                style={{ position: 'absolute', left: '10px', top: '12px', color: isDark ? '#6b7280' : '#9ca3af' }}
              />
            </div>
          </label>
          <label>
            <span style={labelStyle}>Project Description / Scope</span>
            <textarea
              value={data.projectDescription || ''}
              onChange={(e) => updateField('projectDescription', e.target.value)}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="High-level scope of work..."
            />
          </label>
          <label>
            <span style={labelStyle}>Bid Bond Required</span>
            <div style={{ position: 'relative' }}>
              <input
                value={data.bidBondRequirement || ''}
                onChange={(e) => updateField('bidBondRequirement', e.target.value)}
                placeholder="e.g. 5% or $10,000"
                style={inputWithIconStyle}
              />
              <Building
                size={18}
                style={{ position: 'absolute', left: '10px', top: '12px', color: isDark ? '#6b7280' : '#9ca3af' }}
              />
            </div>
          </label>
          <label>
            <span style={labelStyle}>Additional Notes</span>
            <textarea
              value={data.comments || ''}
              onChange={(e) => updateField('comments', e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'none' }}
              placeholder="Add custom notes for calendar invite..."
            />
          </label>
        </div>

        {/* Right Column - Dates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Bid Due Date */}
          <label>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
              <span style={labelStyle}>Bid Due Date</span>
              {getDaysRemainingBadge(data.bidDueDate)}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="datetime-local"
                value={data.bidDueDate ? data.bidDueDate.slice(0, 16) : ''}
                onChange={(e) => handleDateChange('bidDueDate', e.target.value)}
                style={{ ...inputStyle, paddingLeft: '36px', paddingRight: '40px' }}
              />
              <Clock
                size={18}
                style={{ position: 'absolute', left: '10px', top: '12px', color: isDark ? '#6b7280' : '#9ca3af' }}
              />
              {renderCalendarAction('bidDueDate', data.bidDueDate, `[BID DUE] ${data.projectName}`)}
            </div>
          </label>

          {/* RFI Due Date */}
          <label>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
              <span style={labelStyle}>RFI Due Date</span>
              {getDaysRemainingBadge(data.rfiDueDate)}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="datetime-local"
                value={data.rfiDueDate ? data.rfiDueDate.slice(0, 16) : ''}
                onChange={(e) => handleDateChange('rfiDueDate', e.target.value)}
                style={{ ...inputStyle, paddingLeft: '36px', paddingRight: '40px' }}
              />
              <CheckCircle
                size={18}
                style={{ position: 'absolute', left: '10px', top: '12px', color: isDark ? '#6b7280' : '#9ca3af' }}
              />
              {renderCalendarAction('rfiDueDate', data.rfiDueDate, `[RFI DUE] ${data.projectName}`)}
            </div>
          </label>

          {/* Site Visit Date */}
          <label>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
              <span style={labelStyle}>Site Visit Date</span>
              {getDaysRemainingBadge(data.siteVisitDate)}
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="datetime-local"
                  value={data.siteVisitDate ? data.siteVisitDate.slice(0, 16) : ''}
                  onChange={(e) => handleDateChange('siteVisitDate', e.target.value)}
                  style={{ ...inputStyle, paddingRight: '40px' }}
                />
                {renderCalendarAction('siteVisitDate', data.siteVisitDate, `[SITE VISIT] ${data.projectName}`)}
              </div>
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
                }}
              >
                <input
                  type="checkbox"
                  checked={data.isSiteVisitMandatory}
                  onChange={(e) => updateField('isSiteVisitMandatory', e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: data.isSiteVisitMandatory ? '#b91c1c' : isDark ? '#9ca3af' : '#374151',
                  }}
                >
                  Mandatory
                </span>
              </label>
            </div>
          </label>

          {/* RSVP Deadline */}
          <label>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
              <span style={labelStyle}>RSVP Deadline</span>
              {getDaysRemainingBadge(data.rsvpDeadline)}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="datetime-local"
                value={data.rsvpDeadline ? data.rsvpDeadline.slice(0, 16) : ''}
                onChange={(e) => handleDateChange('rsvpDeadline', e.target.value)}
                style={{ ...inputStyle, paddingLeft: '36px', paddingRight: '40px' }}
              />
              <Mail
                size={18}
                style={{ position: 'absolute', left: '10px', top: '12px', color: isDark ? '#6b7280' : '#9ca3af' }}
              />
              {renderCalendarAction('rsvpDeadline', data.rsvpDeadline, `[RSVP] ${data.projectName}`)}
            </div>
          </label>

          {/* Internal Milestones Section */}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px dashed ${isDark ? '#374151' : '#e5e7eb'}` }}>
            <h4
              style={{
                fontSize: '0.9rem',
                fontWeight: '700',
                color: isDark ? '#9ca3af' : '#374151',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <ListChecks size={16} color={isDark ? '#6b7280' : '#9ca3af'} /> Internal Milestones
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Scope Review */}
              <label>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <Search size={14} style={{ marginRight: '6px', color: '#0891b2' }} />
                  <span style={{ ...labelStyle, marginBottom: 0, fontSize: '0.8rem' }}>Scope Review</span>
                  {getDaysRemainingBadge(data.scopeReviewDeadline)}
                </div>
                <input
                  type="datetime-local"
                  value={data.scopeReviewDeadline ? data.scopeReviewDeadline.slice(0, 16) : ''}
                  onChange={(e) => handleDateChange('scopeReviewDeadline', e.target.value)}
                  style={{ ...inputStyle, padding: '8px 10px', fontSize: '0.9rem', background: isDark ? '#0f172a' : '#f9fafb' }}
                />
              </label>

              {/* Subcontractor Bids */}
              <label>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <Users size={14} style={{ marginRight: '6px', color: '#7c3aed' }} />
                  <span style={{ ...labelStyle, marginBottom: 0, fontSize: '0.8rem' }}>Sub Bids Due</span>
                  {getDaysRemainingBadge(data.subcontractorBidDeadline)}
                </div>
                <input
                  type="datetime-local"
                  value={data.subcontractorBidDeadline ? data.subcontractorBidDeadline.slice(0, 16) : ''}
                  onChange={(e) => handleDateChange('subcontractorBidDeadline', e.target.value)}
                  style={{ ...inputStyle, padding: '8px 10px', fontSize: '0.9rem', background: isDark ? '#0f172a' : '#f9fafb' }}
                />
              </label>

              {/* Bond Request */}
              <label>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <Building size={14} style={{ marginRight: '6px', color: '#9333ea' }} />
                  <span style={{ ...labelStyle, marginBottom: 0, fontSize: '0.8rem' }}>Bond Request</span>
                  {getDaysRemainingBadge(data.bondRequestDeadline)}
                </div>
                <input
                  type="datetime-local"
                  value={data.bondRequestDeadline ? data.bondRequestDeadline.slice(0, 16) : ''}
                  onChange={(e) => handleDateChange('bondRequestDeadline', e.target.value)}
                  style={{ ...inputStyle, padding: '8px 10px', fontSize: '0.9rem', background: isDark ? '#0f172a' : '#f9fafb' }}
                />
              </label>

              {/* Addendum Check */}
              <label>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <FileCheck size={14} style={{ marginRight: '6px', color: '#059669' }} />
                  <span style={{ ...labelStyle, marginBottom: 0, fontSize: '0.8rem' }}>Addendum Check</span>
                  {getDaysRemainingBadge(data.addendumCheckDeadline)}
                </div>
                <input
                  type="datetime-local"
                  value={data.addendumCheckDeadline ? data.addendumCheckDeadline.slice(0, 16) : ''}
                  onChange={(e) => handleDateChange('addendumCheckDeadline', e.target.value)}
                  style={{ ...inputStyle, padding: '8px 10px', fontSize: '0.9rem', background: isDark ? '#0f172a' : '#f9fafb' }}
                />
              </label>

              {/* Finalize RFIs */}
              <label>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <CheckCircle size={14} style={{ marginRight: '6px', color: '#4b5563' }} />
                  <span style={{ ...labelStyle, marginBottom: 0, fontSize: '0.8rem' }}>Finalize RFIs</span>
                  {getDaysRemainingBadge(data.finalizeRfiDeadline)}
                </div>
                <input
                  type="datetime-local"
                  value={data.finalizeRfiDeadline ? data.finalizeRfiDeadline.slice(0, 16) : ''}
                  onChange={(e) => handleDateChange('finalizeRfiDeadline', e.target.value)}
                  style={{ ...inputStyle, padding: '8px 10px', fontSize: '0.9rem', background: isDark ? '#0f172a' : '#f9fafb' }}
                />
              </label>

              {/* Final Prep */}
              <label>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <FileText size={14} style={{ marginRight: '6px', color: '#4b5563' }} />
                  <span style={{ ...labelStyle, marginBottom: 0, fontSize: '0.8rem' }}>Final Prep</span>
                  {getDaysRemainingBadge(data.finalizeBidPackageDeadline)}
                </div>
                <input
                  type="datetime-local"
                  value={data.finalizeBidPackageDeadline ? data.finalizeBidPackageDeadline.slice(0, 16) : ''}
                  onChange={(e) => handleDateChange('finalizeBidPackageDeadline', e.target.value)}
                  style={{ ...inputStyle, padding: '8px 10px', fontSize: '0.9rem', background: isDark ? '#0f172a' : '#f9fafb' }}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
