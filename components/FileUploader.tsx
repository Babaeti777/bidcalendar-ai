import React, { useRef, useState, useCallback } from 'react';
import { Upload, FileText, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  onManualEntry: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, onManualEntry }) => {
  const { theme } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (isValidFileType(file)) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const isValidFileType = (file: File) => {
    return file.type === 'application/pdf' || file.type.startsWith('image/');
  };

  const isDark = theme === 'dark';

  return (
    <div style={{ textAlign: 'center', marginTop: '60px' }}>
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#2563eb' : (isDark ? '#374151' : '#e5e7eb')}`,
          borderRadius: '16px',
          padding: '80px 40px',
          position: 'relative',
          cursor: 'pointer',
          background: isDragging ? (isDark ? '#1e3a5f' : '#eff6ff') : (isDark ? '#1f2937' : '#fff'),
          transition: 'all 0.2s',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          accept=".pdf,image/*"
        />
        <div style={{ pointerEvents: 'none' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              background: isDark ? '#1e3a5f' : '#eff6ff',
              color: '#2563eb',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <Upload size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: isDark ? '#f9fafb' : '#111827' }}>
            {isDragging ? 'Drop your file here' : 'Drop your bid documents'}
          </h3>
          <p style={{ color: isDark ? '#9ca3af' : '#6b7280', marginTop: '8px' }}>
            Supports PDF and high-res images of RFPs or ITBs
          </p>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onManualEntry();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'transparent',
            border: `1px solid ${isDark ? '#374151' : '#d1d5db'}`,
            color: isDark ? '#9ca3af' : '#6b7280',
            padding: '10px 20px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          <FileText size={18} />
          Enter manually instead
        </button>
      </div>
    </div>
  );
};
