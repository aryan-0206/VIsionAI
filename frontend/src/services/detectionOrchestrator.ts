// ============================================================
// VisionAI Phase 7C — Detection Orchestrator
// Central handler that processes detections through all managers.
// Run after every detection event from the backend.
// ============================================================

import type { Detection, AppSettings, EventLogEntry } from '../types';
import { alertRuleEngine } from './alertRuleEngine';
import { voiceManager } from './voiceManager';
import { screenshotManager } from './screenshotManager';
import { notificationManager } from './notificationManager';
import { generateId } from '../utils/generateId';

type EventCallback = (entry: EventLogEntry) => void;

class DetectionOrchestrator {
  private eventCallbacks: EventCallback[] = [];

  onEvent(cb: EventCallback) {
    this.eventCallbacks.push(cb);
    return () => {
      this.eventCallbacks = this.eventCallbacks.filter((c) => c !== cb);
    };
  }

  private emitEvent(entry: EventLogEntry) {
    this.eventCallbacks.forEach((cb) => cb(entry));
  }

  // -----------------------------------------------------------
  // Sync managers with current settings
  // -----------------------------------------------------------
  syncSettings(settings: AppSettings, backendUrl: string) {
    voiceManager.configure({
      enabled: settings.voice.enabled,
      volume: settings.voice.volume,
      cooldownSeconds: settings.voice.cooldownSeconds,
      backendUrl,
    });

    screenshotManager.configure({
      enabled: settings.autoScreenshot.enabled,
      mode: settings.autoScreenshot.mode,
      savePath: settings.autoScreenshot.savePath,
      backendUrl,
    });

    notificationManager.configure({
      enabled: settings.notifications.enabled,
      duration: settings.notifications.duration,
      maxVisible: settings.notifications.maxVisible,
    });
  }

  // -----------------------------------------------------------
  // Process a single detection event
  // -----------------------------------------------------------
  async process(detection: Detection, settings: AppSettings): Promise<void> {
    const { alertRules, detection: detSettings } = settings;

    // 1. Min confidence filter
    if (!alertRuleEngine.meetsMinConfidence(detection, detSettings.minConfidence)) {
      return;
    }

    // 2. Evaluate alert rules
    const result = alertRuleEngine.evaluate(alertRules, detection);

    // Always log the detection
    const entry: EventLogEntry = {
      id: generateId('evt'),
      timestamp: detection.timestamp ?? Date.now(),
      object: detection.label,
      trackId: detection.trackId,
      confidence: detection.confidence,
      zone: detection.zone,
      eventType: detection.zone?.toLowerCase().includes('restricted')
        ? 'intrusion'
        : 'detection',
      camera: detection.camera ?? settings.detection.activeCamera,
      severity: result.severity ?? 'info',
      ruleMatched: result.rule?.name,
    };

    // 3. Voice announcement
    if (result.matched && result.rule?.voiceEnabled) {
      void voiceManager.announce({
        label: detection.label,
        trackId: detection.trackId,
        zone: detection.zone,
        confidence: detection.confidence,
      });
    }

    // 4. Toast notification
    if (result.matched) {
      const isIntrusion = detection.zone?.toLowerCase().includes('restricted');
      notificationManager.notify({
        style: result.severity ?? 'info',
        title: isIntrusion
          ? '🚨 Restricted Area Intrusion!'
          : result.rule?.name ?? `${detection.label} Detected`,
        object: detection.label,
        trackId: detection.trackId,
        confidence: detection.confidence,
        zone: detection.zone,
        timestamp: entry.timestamp,
      });
    }

    // 5. Auto screenshot
    if (
      result.matched &&
      result.rule?.screenshotEnabled &&
      screenshotManager.shouldCapture(detection)
    ) {
      void screenshotManager.capture(detection, entry.camera);
    }

    // 6. Emit event for log/timeline
    this.emitEvent(entry);
  }

  // -----------------------------------------------------------
  // Process batch of detections (one frame)
  // -----------------------------------------------------------
  async processBatch(
    detections: Detection[],
    settings: AppSettings
  ): Promise<void> {
    for (const detection of detections) {
      await this.process(detection, settings);
    }
  }
}

export const detectionOrchestrator = new DetectionOrchestrator();
