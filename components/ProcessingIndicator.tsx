import React from 'react';
import { useAppStore } from '../store/useAppStore';

interface ProcessingIndicatorProps {
  status: 'uploading' | 'processing';
  progress: number;
  retryInfo?: { attempt: number; delay: number } | null;
}

export const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({
  status,
  progress,
  retryInfo,
}) => {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';

  return (
    <div style={{ maxWidth: '500px', margin: '80px auto', textAlign: 'center' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '12px',
          fontSize: '0.95rem',
          fontWeight: '500',
          color: isDark ? '#d1d5db' : '#374151',
        }}
      >
        <span>
          {status === 'uploading' ? 'Uploading file...' : 'Deep Thinking Analysis...'}
        </span>
        <span>{Math.round(progress)}%</span>
      </div>

      <div
        style={{
          height: '10px',
          background: isDark ? '#374151' : '#e5e7eb',
          borderRadius: '5px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: '#2563eb',
            width: `${progress}%`,
            transition: 'width 0.4s ease-out',
          }}
        />
      </div>

      <p style={{ marginTop: '16px', color: isDark ? '#9ca3af' : '#6b7280', fontSize: '0.9rem' }}>
        Gemini 3 Pro is extracting technical dates and scope requirements.
      </p>

      {retryInfo && (
        <p
          style={{
            marginTop: '12px',
            color: '#d97706',
            fontSize: '0.85rem',
            background: isDark ? '#451a03' : '#fffbeb',
            padding: '8px 16px',
            borderRadius: '8px',
            display: 'inline-block',
          }}
        >
          Retry attempt {retryInfo.attempt}... waiting {retryInfo.delay / 1000}s
        </p>
      )}
    </div>
  );
};
