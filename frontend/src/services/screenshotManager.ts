// ============================================================
// VisionAI Phase 7C — Screenshot Manager
// Triggers backend screenshot capture and tracks results.
// ============================================================

import type { ScreenshotMode, Detection } from '../types';

interface ScreenshotResult {
  success: boolean;
  path?: string;
  error?: string;
}

class ScreenshotManager {
  private enabled: boolean = false;
  private mode: ScreenshotMode = 'every_detection';
  private savePath: string = 'screenshots/';
  private backendUrl: string = 'http://localhost:5000';
  private listeners: Array<(result: ScreenshotResult) => void> = [];

  configure(opts: {
    enabled?: boolean;
    mode?: ScreenshotMode;
    savePath?: string;
    backendUrl?: string;
  }) {
    if (opts.enabled !== undefined) this.enabled = opts.enabled;
    if (opts.mode !== undefined) this.mode = opts.mode;
    if (opts.savePath !== undefined) this.savePath = opts.savePath;
    if (opts.backendUrl !== undefined) this.backendUrl = opts.backendUrl;
  }

  onCapture(cb: (result: ScreenshotResult) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify(result: ScreenshotResult) {
    this.listeners.forEach((l) => l(result));
  }

  // -----------------------------------------------------------
  // Determine if a screenshot should be captured
  // -----------------------------------------------------------
  shouldCapture(detection: Detection): boolean {
    if (!this.enabled) return false;

    const vehicleLabels = ['car', 'truck', 'bus', 'motorcycle', 'bicycle', 'van'];
    const label = detection.label.toLowerCase();

    switch (this.mode) {
      case 'every_detection':
        return true;
      case 'person_only':
        return label === 'person';
      case 'vehicle_only':
        return vehicleLabels.includes(label);
      case 'intrusion_only':
        return (
          label === 'person' &&
          !!detection.zone?.toLowerCase().includes('restricted')
        );
      case 'manual_only':
        return false;
      default:
        return false;
    }
  }

  // -----------------------------------------------------------
  // Generate unique filename
  // -----------------------------------------------------------
  private generateFilename(label: string, trackId?: number): string {
    const now = new Date();
    const ts = now
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, 19);
    const suffix = trackId !== undefined ? `_id${trackId}` : '';
    return `${this.savePath}${label}${suffix}_${ts}.jpg`;
  }

  // -----------------------------------------------------------
  // Request screenshot from backend (async, non-blocking)
  // -----------------------------------------------------------
  async capture(detection: Detection, cameraId?: string): Promise<void> {
    const filename = this.generateFilename(detection.label, detection.trackId);

    void (async () => {
      try {
        const res = await fetch(`${this.backendUrl}/api/screenshot/capture`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename,
            label: detection.label,
            track_id: detection.trackId,
            confidence: detection.confidence,
            camera_id: cameraId ?? 'default',
            bbox: detection.bbox,
          }),
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          const data = (await res.json()) as { path?: string };
          this.notify({ success: true, path: data.path ?? filename });
        } else {
          this.notify({ success: false, error: 'Backend screenshot failed' });
        }
      } catch (err) {
        this.notify({
          success: false,
          error: err instanceof Error ? err.message : 'Screenshot error',
        });
      }
    })();
  }

  // -----------------------------------------------------------
  // Manual screenshot trigger
  // -----------------------------------------------------------
  async captureManual(cameraId?: string): Promise<void> {
    const filename = this.generateFilename('manual');

    void (async () => {
      try {
        const res = await fetch(`${this.backendUrl}/api/screenshot/manual`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, camera_id: cameraId ?? 'default' }),
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          const data = (await res.json()) as { path?: string };
          this.notify({ success: true, path: data.path ?? filename });
        } else {
          this.notify({ success: false, error: 'Manual screenshot failed' });
        }
      } catch (err) {
        this.notify({
          success: false,
          error: err instanceof Error ? err.message : 'Screenshot error',
        });
      }
    })();
  }
}

export const screenshotManager = new ScreenshotManager();
