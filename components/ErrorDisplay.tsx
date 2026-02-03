import React from 'react';
import { AlertCircle, RefreshCw, FileText, WifiOff, Clock, Key, FileWarning } from 'lucide-react';
import { AppError, ErrorType } from '../types';
import { useAppStore } from '../store/useAppStore';

interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  onManualEntry?: () => void;
}

const errorIcons: Record<ErrorType, React.ReactNode> = {
  network_error: <WifiOff size={20} />,
  api_error: <Key size={20} />,
  invalid_document: <FileWarning size={20} />,
  extraction_failed: <FileText size={20} />,
  no_dates_found: <Clock size={20} />,
  file_too_large: <FileWarning size={20} />,
  unsupported_format: <FileWarning size={20} />,
  rate_limit: <Clock size={20} />,
  unknown: <AlertCircle size={20} />,
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry, onManualEntry }) => {
  const { theme } = useAppStore();
  const isDark = theme === 'dark';

  return (
    <div
      style={{
        background: isDark ? '#451a1a' : '#fef2f2',
        border: `1px solid ${isDark ? '#7f1d1d' : '#fee2e2'}`,
        color: isDark ? '#fca5a5' : '#b91c1c',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{ marginTop: '2px' }}>
          {errorIcons[error.type] || <AlertCircle size={20} />}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: '600', marginBottom: '4px' }}>{error.message}</p>
          {error.details && (
            <p style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '16px' }}>{error.details}</p>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {error.retryable && onRetry && (
              <button
                onClick={onRetry}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isDark ? '#7f1d1d' : '#dc2626',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={14} />
                Try Again
              </button>
            )}

            {onManualEntry && (
              <button
                onClick={onManualEntry}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'transparent',
                  color: isDark ? '#fca5a5' : '#b91c1c',
                  border: `1px solid ${isDark ? '#7f1d1d' : '#fecaca'}`,
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                <FileText size={14} />
                Enter Manually
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
