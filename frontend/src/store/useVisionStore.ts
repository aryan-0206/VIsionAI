// ============================================================
// VisionAI Phase 7C — Global Zustand Store
// ============================================================
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppSettings,
  AlertRule,
  EventLogEntry,
  ToastNotification,
  AlertPanelState,
} from '../types';
import { generateId } from '../utils/generateId';

// -----------------------------------------------------------
// Default Settings
// -----------------------------------------------------------
const DEFAULT_SETTINGS: AppSettings = {
  voice: {
    enabled: true,
    volume: 75,
    cooldownSeconds: 10,
  },
  autoScreenshot: {
    enabled: false,
    mode: 'every_detection',
    savePath: 'screenshots/',
  },
  notifications: {
    enabled: true,
    duration: 5000,
    maxVisible: 5,
  },
  alertRules: [
    {
      id: 'rule_default_person',
      name: 'Person Detected',
      enabled: true,
      conditions: [{ type: 'label', value: 'person' }],
      severity: 'warning',
      voiceEnabled: true,
      screenshotEnabled: false,
      createdAt: Date.now(),
    },
    {
      id: 'rule_default_vehicle',
      name: 'Vehicle Detected',
      enabled: true,
      conditions: [
        { type: 'label', value: 'car' },
      ],
      severity: 'info',
      voiceEnabled: true,
      screenshotEnabled: false,
      createdAt: Date.now(),
    },
    {
      id: 'rule_default_intrusion',
      name: 'Restricted Area Intrusion',
      enabled: true,
      conditions: [
        { type: 'label', value: 'person' },
        { type: 'inside_zone', value: 'restricted' },
      ],
      severity: 'danger',
      voiceEnabled: true,
      screenshotEnabled: true,
      createdAt: Date.now(),
    },
  ],
  eventLog: {
    maxEntries: 200,
    retentionHours: 24,
  },
  detection: {
    minConfidence: 0.5,
    activeCamera: 'webcam',
  },
};

// -----------------------------------------------------------
// Store Shape
// -----------------------------------------------------------
interface VisionStore {
  // Settings
  settings: AppSettings;
  updateVoiceSettings: (patch: Partial<AppSettings['voice']>) => void;
  updateScreenshotSettings: (patch: Partial<AppSettings['autoScreenshot']>) => void;
  updateNotificationSettings: (patch: Partial<AppSettings['notifications']>) => void;
  updateDetectionSettings: (patch: Partial<AppSettings['detection']>) => void;
  resetSettings: () => void;

  // Alert Rules
  addAlertRule: (rule: Omit<AlertRule, 'id' | 'createdAt'>) => void;
  updateAlertRule: (id: string, patch: Partial<AlertRule>) => void;
  deleteAlertRule: (id: string) => void;
  toggleAlertRule: (id: string) => void;
  resetAlertRules: () => void;

  // Event Log
  events: EventLogEntry[];
  addEvent: (entry: Omit<EventLogEntry, 'id'>) => void;
  clearEvents: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Toast Notifications
  toasts: ToastNotification[];
  addToast: (toast: Omit<ToastNotification, 'id'>) => void;
  dismissToast: (id: string) => void;
  clearToasts: () => void;

  // Alert Panel
  alertPanel: AlertPanelState;
  incrementAlertCount: (entry: EventLogEntry) => void;
  updateVoiceStatus: (status: AlertPanelState['voiceStatus']) => void;
  updateScreenshotStatus: (status: AlertPanelState['screenshotStatus']) => void;

  // UI State
  activeNav: string;
  setActiveNav: (nav: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  showEventLog: boolean;
  setShowEventLog: (show: boolean) => void;
  showTimeline: boolean;
  setShowTimeline: (show: boolean) => void;
  showAlertPanel: boolean;
  setShowAlertPanel: (show: boolean) => void;

  // Backend connection
  backendConnected: boolean;
  setBackendConnected: (connected: boolean) => void;
  backendUrl: string;
  setBackendUrl: (url: string) => void;

  // Simulated detection state (for demo / live polling)
  isStreaming: boolean;
  setIsStreaming: (s: boolean) => void;
  currentDetections: Array<{ label: string; confidence: number; trackId?: number; zone?: string }>;
  setCurrentDetections: (d: Array<{ label: string; confidence: number; trackId?: number; zone?: string }>) => void;
}

const getInitialBackendUrl = (): string => {
  // Runtime check: if we're on localhost, Flask IS the backend at port 5000.
  // This makes `python app.py` work out-of-the-box with zero config.
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return `http://localhost:${window.location.port === '5000' ? '5000' : '5000'}`;
  }
  // Production (Vercel / any other host): use the env var baked in at build time.
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL as string;
  }
  // Last fallback
  return 'http://localhost:5000';
};

export const useVisionStore = create<VisionStore>()(
  persist(
    (set, _get) => ({
      // -------------------------------------------------------
      // Settings
      // -------------------------------------------------------
      settings: DEFAULT_SETTINGS,

      updateVoiceSettings: (patch) =>
        set((s) => ({
          settings: { ...s.settings, voice: { ...s.settings.voice, ...patch } },
        })),

      updateScreenshotSettings: (patch) =>
        set((s) => ({
          settings: {
            ...s.settings,
            autoScreenshot: { ...s.settings.autoScreenshot, ...patch },
          },
        })),

      updateNotificationSettings: (patch) =>
        set((s) => ({
          settings: {
            ...s.settings,
            notifications: { ...s.settings.notifications, ...patch },
          },
        })),

      updateDetectionSettings: (patch) =>
        set((s) => ({
          settings: {
            ...s.settings,
            detection: { ...s.settings.detection, ...patch },
          },
        })),

      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),

      // -------------------------------------------------------
      // Alert Rules
      // -------------------------------------------------------
      addAlertRule: (rule) =>
        set((s) => ({
          settings: {
            ...s.settings,
            alertRules: [
              ...s.settings.alertRules,
              { ...rule, id: generateId('rule'), createdAt: Date.now() },
            ],
          },
        })),

      updateAlertRule: (id, patch) =>
        set((s) => ({
          settings: {
            ...s.settings,
            alertRules: s.settings.alertRules.map((r) =>
              r.id === id ? { ...r, ...patch } : r
            ),
          },
        })),

      deleteAlertRule: (id) =>
        set((s) => ({
          settings: {
            ...s.settings,
            alertRules: s.settings.alertRules.filter((r) => r.id !== id),
          },
        })),

      toggleAlertRule: (id) =>
        set((s) => ({
          settings: {
            ...s.settings,
            alertRules: s.settings.alertRules.map((r) =>
              r.id === id ? { ...r, enabled: !r.enabled } : r
            ),
          },
        })),

      resetAlertRules: () =>
        set((s) => ({
          settings: { ...s.settings, alertRules: DEFAULT_SETTINGS.alertRules },
        })),

      // -------------------------------------------------------
      // Event Log
      // -------------------------------------------------------
      events: [],
      searchQuery: '',

      addEvent: (entry) =>
        set((s) => {
          const max = s.settings.eventLog.maxEntries;
          const newEvents = [
            { ...entry, id: generateId('evt') },
            ...s.events,
          ].slice(0, max);
          return { events: newEvents };
        }),

      clearEvents: () => set({ events: [] }),
      setSearchQuery: (q) => set({ searchQuery: q }),

      // -------------------------------------------------------
      // Toast Notifications
      // -------------------------------------------------------
      toasts: [],

      addToast: (toast) =>
        set((s) => {
          const max = s.settings.notifications.maxVisible;
          const newToast: ToastNotification = {
            ...toast,
            id: generateId('toast'),
          };
          return { toasts: [newToast, ...s.toasts].slice(0, max) };
        }),

      dismissToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      clearToasts: () => set({ toasts: [] }),

      // -------------------------------------------------------
      // Alert Panel
      // -------------------------------------------------------
      alertPanel: {
        activeAlerts: 0,
        alertCount: 0,
        voiceStatus: 'active',
        screenshotStatus: 'disabled',
      },

      incrementAlertCount: (entry) =>
        set((s) => ({
          alertPanel: {
            ...s.alertPanel,
            alertCount: s.alertPanel.alertCount + 1,
            activeAlerts: s.alertPanel.activeAlerts + 1,
            lastAlert: entry,
          },
        })),

      updateVoiceStatus: (status) =>
        set((s) => ({ alertPanel: { ...s.alertPanel, voiceStatus: status } })),

      updateScreenshotStatus: (status) =>
        set((s) => ({
          alertPanel: { ...s.alertPanel, screenshotStatus: status },
        })),

      // -------------------------------------------------------
      // UI State
      // -------------------------------------------------------
      activeNav: 'live',
      setActiveNav: (nav) => set({ activeNav: nav }),
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      showEventLog: true,
      setShowEventLog: (show) => set({ showEventLog: show }),
      showTimeline: true,
      setShowTimeline: (show) => set({ showTimeline: show }),
      showAlertPanel: true,
      setShowAlertPanel: (show) => set({ showAlertPanel: show }),

      // -------------------------------------------------------
      // Backend
      // -------------------------------------------------------
      backendConnected: false,
      setBackendConnected: (connected) => set({ backendConnected: connected }),
      backendUrl: getInitialBackendUrl(),
      setBackendUrl: (url) => set({ backendUrl: url }),

      // -------------------------------------------------------
      // Detection
      // -------------------------------------------------------
      isStreaming: false,
      setIsStreaming: (s) => set({ isStreaming: s }),
      currentDetections: [],
      setCurrentDetections: (d) => set({ currentDetections: d }),
    }),
    {
      name: 'visionai-storage',
      partialize: (state) => ({
        settings: state.settings,
        activeNav: state.activeNav,
        backendUrl: state.backendUrl,
      }),
    }
  )
);
