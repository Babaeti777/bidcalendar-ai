import React from 'react';
import { BrainCircuit, Settings2, Moon, Sun, Monitor } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Theme } from '../types';

interface HeaderProps {
  onSettingsClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSettingsClick }) => {
  const { theme, setTheme } = useAppStore();
  const isDark = theme === 'dark';

  const cycleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: '#2563eb', padding: '8px', borderRadius: '10px' }}>
          <BrainCircuit color="#fff" size={24} />
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: isDark ? '#f9fafb' : '#111827' }}>
          BidCalendar AI
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={cycleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            border: 'none',
            background: isDark ? '#374151' : '#f3f4f6',
            color: isDark ? '#9ca3af' : '#6b7280',
            cursor: 'pointer',
          }}
          title={`Theme: ${theme}`}
        >
          <ThemeIcon size={20} />
        </button>
        <button
          onClick={onSettingsClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            border: 'none',
            background: isDark ? '#374151' : '#f3f4f6',
            color: isDark ? '#9ca3af' : '#6b7280',
            cursor: 'pointer',
          }}
          title="Settings"
        >
          <Settings2 size={20} />
        </button>
      </div>
    </header>
  );
};
