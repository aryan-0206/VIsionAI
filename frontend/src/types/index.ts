// ============================================================
// VisionAI Phase 7C — Core Type Definitions
// ============================================================

export type AlertSeverity = 'info' | 'success' | 'warning' | 'danger';

export type EventType =
  | 'detection'
  | 'intrusion'
  | 'tracking'
  | 'screenshot'
  | 'voice'
  | 'zone_entry'
  | 'zone_exit';

export type ScreenshotMode =
  | 'every_detection'
  | 'person_only'
  | 'vehicle_only'
  | 'intrusion_only'
  | 'manual_only';

export type NotificationStyle = 'info' | 'success' | 'warning' | 'danger';

// -----------------------------------------------------------
// Detection / Tracking
// -----------------------------------------------------------
export interface Detection {
  id: string;
  trackId?: number;
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // x, y, w, h
  zone?: string;
  timestamp: number; // epoch ms
  camera?: string;
}

// -----------------------------------------------------------
// Alert Rules
// -----------------------------------------------------------
export type AlertConditionType =
  | 'label'
  | 'confidence_above'
  | 'confidence_below'
  | 'inside_roi'
  | 'inside_zone'
  | 'any';

export interface AlertCondition {
  type: AlertConditionType;
  value?: string | number; // label name | confidence threshold | zone name
}

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: AlertCondition[];
  severity: AlertSeverity;
  voiceEnabled: boolean;
  screenshotEnabled: boolean;
  createdAt: number;
}

// -----------------------------------------------------------
// Event Log
// -----------------------------------------------------------
export interface EventLogEntry {
  id: string;
  timestamp: number;
  object: string;
  trackId?: number;
  confidence: number;
  zone?: string;
  eventType: EventType;
  camera?: string;
  severity: AlertSeverity;
  ruleMatched?: string;
  screenshotPath?: string;
}

// -----------------------------------------------------------
// Toast Notifications
// -----------------------------------------------------------
export interface ToastNotification {
  id: string;
  style: NotificationStyle;
  title: string;
  object: string;
  trackId?: number;
  confidence: number;
  timestamp: number;
  zone?: string;
  duration?: number; // ms before auto-dismiss
}

// -----------------------------------------------------------
// Voice Settings
// -----------------------------------------------------------
export interface VoiceSettings {
  enabled: boolean;
  volume: number; // 0–100
  cooldownSeconds: number;
  testPhrase?: string;
}

// -----------------------------------------------------------
// Settings
// -----------------------------------------------------------
export interface AppSettings {
  voice: VoiceSettings;
  autoScreenshot: {
    enabled: boolean;
    mode: ScreenshotMode;
    savePath: string;
  };
  notifications: {
    enabled: boolean;
    duration: number; // ms
    maxVisible: number;
  };
  alertRules: AlertRule[];
  eventLog: {
    maxEntries: number;
    retentionHours: number;
  };
  detection: {
    minConfidence: number;
    activeCamera: string;
  };
}

// -----------------------------------------------------------
// Alert Panel State
// -----------------------------------------------------------
export interface AlertPanelState {
  activeAlerts: number;
  lastAlert?: EventLogEntry;
  alertCount: number;
  voiceStatus: 'active' | 'muted' | 'error';
  screenshotStatus: 'active' | 'disabled' | 'error';
}

// -----------------------------------------------------------
// API Response shapes (Flask backend)
// -----------------------------------------------------------
export interface BackendDetectionEvent {
  id: string;
  track_id?: number;
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
  zone?: string;
  camera?: string;
  timestamp?: number;
}

export interface BackendStatus {
  voice_enabled: boolean;
  voice_volume: number;
  voice_cooldown: number;
  auto_screenshot: boolean;
  screenshot_mode: ScreenshotMode;
  notifications_enabled: boolean;
  active_rules: number;
  event_count: number;
  uptime_seconds: number;
}

export interface BackendSettingsResponse {
  success: boolean;
  message?: string;
  settings?: Partial<AppSettings>;
}

export interface BackendEventsResponse {
  events: EventLogEntry[];
  total: number;
}
