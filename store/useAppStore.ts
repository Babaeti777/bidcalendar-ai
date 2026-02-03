import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  FullProjectData,
  ProcessingStatus,
  ExportOptions,
  ChatMessage,
  ConversationSummary,
  LeadTimeSettings,
  DEFAULT_LEAD_TIMES,
  AppError,
  AuditLogEntry,
  Theme,
  RedactionSettings,
  DEFAULT_REDACTION_PATTERNS,
} from '../types';
import { calculateInternalEvents } from '../utils/calendar';

interface FileState {
  fileBase64: string | null;
  fileType: string;
  fileName: string | null;
}

interface AppState {
  // Processing state
  status: ProcessingStatus;
  progress: number;
  data: FullProjectData | null;
  error: AppError | null;

  // File state
  file: FileState;

  // UI state
  showBatchSyncModal: boolean;
  calendarProvider: 'google' | 'outlook';
  activeCalendarPopover: string | null;
  showSettings: boolean;

  // Export options
  exportOptions: ExportOptions;

  // Chat state
  chatMessages: ChatMessage[];
  chatInput: string;
  isAssistantThinking: boolean;
  conversationSummary: ConversationSummary | null;

  // Settings (persisted)
  leadTimeSettings: LeadTimeSettings;
  theme: Theme;
  redactionSettings: RedactionSettings;

  // Audit log
  auditLog: AuditLogEntry[];

  // Actions
  setStatus: (status: ProcessingStatus) => void;
  setProgress: (progress: number) => void;
  setData: (data: FullProjectData | null) => void;
  setError: (error: AppError | null) => void;
  setFile: (file: FileState) => void;
  clearFile: () => void;

  setShowBatchSyncModal: (show: boolean) => void;
  setCalendarProvider: (provider: 'google' | 'outlook') => void;
  setActiveCalendarPopover: (popover: string | null) => void;
  setShowSettings: (show: boolean) => void;

  setExportOptions: (options: Partial<ExportOptions>) => void;
  toggleReminder: (key: keyof ExportOptions['reminders']) => void;

  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setChatInput: (input: string) => void;
  setIsAssistantThinking: (thinking: boolean) => void;
  setConversationSummary: (summary: ConversationSummary | null) => void;
  clearChat: () => void;

  setLeadTimeSettings: (settings: Partial<LeadTimeSettings>) => void;
  setTheme: (theme: Theme) => void;
  setRedactionSettings: (settings: Partial<RedactionSettings>) => void;

  updateField: (field: keyof FullProjectData, value: string | boolean | null) => void;
  recalculateInternalEvents: () => void;

  addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
  clearAuditLog: () => void;

  reset: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const initialState = {
  status: 'idle' as ProcessingStatus,
  progress: 0,
  data: null,
  error: null,
  file: { fileBase64: null, fileType: '', fileName: null },
  showBatchSyncModal: false,
  calendarProvider: 'outlook' as const,
  activeCalendarPopover: null,
  showSettings: false,
  exportOptions: {
    includeInternal: true,
    reminders: {
      oneHour: true,
      oneDay: true,
      threeDays: false,
      oneWeek: false,
    },
  },
  chatMessages: [],
  chatInput: '',
  isAssistantThinking: false,
  conversationSummary: null,
  auditLog: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Persisted settings with defaults
      leadTimeSettings: DEFAULT_LEAD_TIMES,
      theme: 'system',
      redactionSettings: {
        enabled: false,
        patterns: DEFAULT_REDACTION_PATTERNS,
      },

      // Processing actions
      setStatus: (status) => set({ status }),
      setProgress: (progress) => set({ progress }),
      setData: (data) => set({ data }),
      setError: (error) => set({ error }),

      // File actions
      setFile: (file) => set({ file }),
      clearFile: () => set({ file: { fileBase64: null, fileType: '', fileName: null } }),

      // UI actions
      setShowBatchSyncModal: (show) => set({ showBatchSyncModal: show }),
      setCalendarProvider: (provider) => set({ calendarProvider: provider }),
      setActiveCalendarPopover: (popover) => set({ activeCalendarPopover: popover }),
      setShowSettings: (show) => set({ showSettings: show }),

      // Export options actions
      setExportOptions: (options) =>
        set((state) => ({
          exportOptions: { ...state.exportOptions, ...options },
        })),
      toggleReminder: (key) =>
        set((state) => ({
          exportOptions: {
            ...state.exportOptions,
            reminders: {
              ...state.exportOptions.reminders,
              [key]: !state.exportOptions.reminders[key],
            },
          },
        })),

      // Chat actions
      addChatMessage: (message) =>
        set((state) => ({
          chatMessages: [
            ...state.chatMessages,
            {
              ...message,
              id: generateId(),
              timestamp: Date.now(),
            },
          ],
        })),
      setChatInput: (input) => set({ chatInput: input }),
      setIsAssistantThinking: (thinking) => set({ isAssistantThinking: thinking }),
      setConversationSummary: (summary) => set({ conversationSummary: summary }),
      clearChat: () => set({ chatMessages: [], conversationSummary: null }),

      // Settings actions
      setLeadTimeSettings: (settings) =>
        set((state) => ({
          leadTimeSettings: { ...state.leadTimeSettings, ...settings },
        })),
      setTheme: (theme) => set({ theme }),
      setRedactionSettings: (settings) =>
        set((state) => ({
          redactionSettings: { ...state.redactionSettings, ...settings },
        })),

      // Data field update with automatic recalculation
      updateField: (field, value) => {
        const state = get();
        if (!state.data) return;

        const newData = { ...state.data, [field]: value };

        // Recalculate internal events if a primary date changed
        if (field === 'bidDueDate' || field === 'rfiDueDate') {
          const recalculated = calculateInternalEvents(newData, state.leadTimeSettings);
          set({ data: recalculated as FullProjectData });
        } else {
          set({ data: newData });
        }

        // Log the edit
        get().addAuditLog({
          action: 'edit',
          details: { field, value },
        });
      },

      recalculateInternalEvents: () => {
        const state = get();
        if (!state.data) return;
        const recalculated = calculateInternalEvents(state.data, state.leadTimeSettings);
        set({ data: recalculated as FullProjectData });
      },

      // Audit log actions
      addAuditLog: (entry) =>
        set((state) => ({
          auditLog: [
            ...state.auditLog,
            {
              ...entry,
              id: generateId(),
              timestamp: Date.now(),
            },
          ],
        })),
      clearAuditLog: () => set({ auditLog: [] }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'bidcalendar-storage',
      partialize: (state) => ({
        leadTimeSettings: state.leadTimeSettings,
        theme: state.theme,
        redactionSettings: state.redactionSettings,
        chatMessages: state.chatMessages,
        conversationSummary: state.conversationSummary,
        auditLog: state.auditLog,
      }),
    }
  )
);

// Theme effect hook helper
export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && systemDark);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};
