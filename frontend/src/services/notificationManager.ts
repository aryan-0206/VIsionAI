// ============================================================
// VisionAI Phase 7C — Notification Manager
// Deduplicates and dispatches toast notifications.
// ============================================================

import type { ToastNotification, NotificationStyle } from '../types';
import { generateId } from '../utils/generateId';

type ToastHandler = (toast: ToastNotification) => void;

class NotificationManager {
  private enabled: boolean = true;
  private duration: number = 5000;
  // maxVisible controlled by store

  private recentKeys = new Set<string>();
  private dedupeWindowMs: number = 2000;
  private handlers: ToastHandler[] = [];

  configure(opts: {
    enabled?: boolean;
    duration?: number;
    maxVisible?: number;
  }) {
    if (opts.enabled !== undefined) this.enabled = opts.enabled;
    if (opts.duration !== undefined) this.duration = opts.duration;
    // maxVisible managed by store
  }

  onToast(handler: ToastHandler) {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  // -----------------------------------------------------------
  // Deduplicate notifications within a short window
  // -----------------------------------------------------------
  private isDuplicate(key: string): boolean {
    if (this.recentKeys.has(key)) return true;
    this.recentKeys.add(key);
    setTimeout(() => this.recentKeys.delete(key), this.dedupeWindowMs);
    return false;
  }

  // -----------------------------------------------------------
  // Dispatch a toast
  // -----------------------------------------------------------
  notify(opts: {
    style: NotificationStyle;
    title: string;
    object: string;
    trackId?: number;
    confidence: number;
    zone?: string;
    timestamp?: number;
    duration?: number;
  }): void {
    if (!this.enabled) return;

    const dedupeKey = `${opts.object}_${opts.trackId ?? 'x'}_${opts.style}`;
    if (this.isDuplicate(dedupeKey)) return;

    const toast: ToastNotification = {
      id: generateId('toast'),
      style: opts.style,
      title: opts.title,
      object: opts.object,
      trackId: opts.trackId,
      confidence: opts.confidence,
      timestamp: opts.timestamp ?? Date.now(),
      zone: opts.zone,
      duration: opts.duration ?? this.duration,
    };

    this.handlers.forEach((h) => h(toast));
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}

export const notificationManager = new NotificationManager();
