import React, { useEffect, useState, useCallback } from 'react';
import { useAppStore, applyTheme } from './store/useAppStore';
import {
  Header,
  FileUploader,
  ErrorDisplay,
  ProcessingIndicator,
  DataEditor,
  ChatSidebar,
  ExportPanel,
  ManualEntryForm,
  BatchSyncModal,
  SettingsModal,
} from './components';
import { extractBidInfo, classifyError } from './services/gemini';
import { calculateInternalEvents } from './utils/calendar';
import { FullProjectData } from './types';

const App: React.FC = () => {
  const {
    status,
    setStatus,
    progress,
    setProgress,
    data,
    setData,
    error,
    setError,
    theme,
    showBatchSyncModal,
    setShowBatchSyncModal,
    showSettings,
    setShowSettings,
    setFile,
    leadTimeSettings,
    addAuditLog,
    redactionSettings,
  } = useAppStore();

  const [retryInfo, setRetryInfo] = useState<{ attempt: number; delay: number } | null>(null);

  const isDark = theme === 'dark';

  // Apply theme on mount and change
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const startProgress = useCallback(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev: number) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.random() * 5;
      });
    }, 300);
    return interval;
  }, [setProgress]);

  const handleFileSelect = async (file: File) => {
    setStatus('uploading');
    setError(null);
    setRetryInfo(null);

    const progressInterval = startProgress();

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = reader.result as string;
          const base64 = result.split(',')[1];

          setFile({
            fileBase64: base64,
            fileType: file.type,
            fileName: file.name,
          });

          addAuditLog({
            action: 'upload',
            details: { fileName: file.name, fileType: file.type, fileSize: file.size },
          });

          setStatus('processing');

          const extracted = await extractBidInfo(
            base64,
            file.type,
            (attempt, delay) => {
              setRetryInfo({ attempt, delay });
            }
          );

          const fullData = calculateInternalEvents(extracted, leadTimeSettings) as FullProjectData;

          clearInterval(progressInterval);
          setProgress(100);
          setRetryInfo(null);

          addAuditLog({
            action: 'extract',
            details: {
              projectName: fullData.projectName,
              hasDatesBid: !!fullData.bidDueDate,
              hasDatesRfi: !!fullData.rfiDueDate,
            },
          });

          setTimeout(() => {
            setData(fullData);
            setStatus('review');
          }, 400);
        } catch (err: any) {
          clearInterval(progressInterval);
          console.error(err);
          const appError = classifyError(err);
          setError(appError);
          setStatus('error');
          setRetryInfo(null);

          addAuditLog({
            action: 'error',
            details: { type: appError.type, message: appError.message },
          });
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      clearInterval(progressInterval);
      setError({
        type: 'unknown',
        message: 'Error reading file',
        details: 'Could not read the selected file.',
        retryable: false,
      });
      setStatus('error');
    }
  };

  const handleManualEntry = () => {
    setStatus('manual');
  };

  const handleBackToIdle = () => {
    setStatus('idle');
    setError(null);
  };

  const handleRetry = () => {
    setStatus('idle');
    setError(null);
  };

  const handlePlannerSync = () => {
    if (!data) return;

    // Build query params for High-Performance Planner integration
    const params = new URLSearchParams({
      source: 'bidcalendar',
      project: data.projectName,
      agency: data.agencyName,
    });

    if (data.bidDueDate) params.append('bidDue', data.bidDueDate);
    if (data.rfiDueDate) params.append('rfiDue', data.rfiDueDate);
    if (data.siteVisitDate) params.append('siteVisit', data.siteVisitDate);

    const plannerUrl = `https://babaeti777.github.io/High-Performance-Planner/?${params.toString()}`;
    window.open(plannerUrl, '_blank');

    addAuditLog({
      action: 'sync',
      details: { provider: 'planner', projectName: data.projectName },
    });
  };

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
        minHeight: '100vh',
        background: isDark ? '#111827' : '#fff',
        transition: 'background 0.3s',
      }}
    >
      <Header onSettingsClick={() => setShowSettings(true)} />

      {/* Error Display */}
      {error && status === 'error' && (
        <ErrorDisplay error={error} onRetry={handleRetry} onManualEntry={handleManualEntry} />
      )}

      {/* Idle State - File Upload */}
      {status === 'idle' && <FileUploader onFileSelect={handleFileSelect} onManualEntry={handleManualEntry} />}

      {/* Manual Entry Form */}
      {status === 'manual' && <ManualEntryForm onBack={handleBackToIdle} />}

      {/* Processing State */}
      {(status === 'uploading' || status === 'processing') && (
        <ProcessingIndicator status={status} progress={progress} retryInfo={retryInfo} />
      )}

      {/* Review State */}
      {status === 'review' && data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <DataEditor />
            <ExportPanel onBatchSync={() => setShowBatchSyncModal(true)} onPlannerSync={handlePlannerSync} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <ChatSidebar />
          </div>
        </div>
      )}

      {/* Modals */}
      {showBatchSyncModal && data && <BatchSyncModal onClose={() => setShowBatchSyncModal(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default App;
