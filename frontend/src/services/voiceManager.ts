// ============================================================
// VisionAI Phase 7C — Voice Manager (Web Speech API fallback)
// Communicates with Flask backend for pyttsx3 voice alerts.
// Falls back to browser SpeechSynthesis when backend is unavailable.
// ============================================================

type VoiceStatus = 'active' | 'muted' | 'error';

interface VoiceCooldownMap {
  [key: string]: number; // label+trackId → last announced epoch ms
}

class VoiceManager {
  private enabled: boolean = true;
  private volume: number = 0.75;
  private cooldownMs: number = 10000;
  private cooldowns: VoiceCooldownMap = {};
  private backendUrl: string = 'http://localhost:5000';
  private useBackend: boolean = true;
  private status: VoiceStatus = 'active';
  private listeners: Array<(status: VoiceStatus) => void> = [];

  // -----------------------------------------------------------
  // Configuration
  // -----------------------------------------------------------
  configure(opts: {
    enabled?: boolean;
    volume?: number;
    cooldownSeconds?: number;
    backendUrl?: string;
  }) {
    if (opts.enabled !== undefined) this.enabled = opts.enabled;
    if (opts.volume !== undefined) this.volume = opts.volume / 100;
    if (opts.cooldownSeconds !== undefined)
      this.cooldownMs = opts.cooldownSeconds * 1000;
    if (opts.backendUrl !== undefined) this.backendUrl = opts.backendUrl;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this.updateStatus(enabled ? 'active' : 'muted');
  }

  setVolume(volume: number) {
    this.volume = volume / 100;
  }

  setCooldown(seconds: number) {
    this.cooldownMs = seconds * 1000;
  }

  getStatus(): VoiceStatus {
    return this.status;
  }

  onStatusChange(cb: (status: VoiceStatus) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private updateStatus(status: VoiceStatus) {
    this.status = status;
    this.listeners.forEach((l) => l(status));
  }

  // -----------------------------------------------------------
  // Cooldown Check
  // -----------------------------------------------------------
  private getCooldownKey(label: string, trackId?: number): string {
    return trackId !== undefined ? `${label}_${trackId}` : label;
  }

  private isInCooldown(label: string, trackId?: number): boolean {
    const key = this.getCooldownKey(label, trackId);
    const last = this.cooldowns[key];
    if (!last) return false;
    return Date.now() - last < this.cooldownMs;
  }

  private markAnnounced(label: string, trackId?: number) {
    const key = this.getCooldownKey(label, trackId);
    this.cooldowns[key] = Date.now();
  }

  // -----------------------------------------------------------
  // Phrase Builder
  // -----------------------------------------------------------
  private buildPhrase(
    label: string,
    trackId?: number,
    zone?: string,
    confidence?: number
  ): string {
    const capLabel = label.charAt(0).toUpperCase() + label.slice(1);

    if (zone && zone.toLowerCase().includes('restricted')) {
      return `Restricted area intrusion! ${capLabel} detected${trackId !== undefined ? `, tracking ID ${trackId}` : ''}.`;
    }
    if (zone) {
      return `${capLabel} detected in ${zone}${trackId !== undefined ? `, ID ${trackId}` : ''}.`;
    }
    if (confidence !== undefined && confidence < 0.6) {
      return `Possible ${capLabel.toLowerCase()} detected.`;
    }

    const vehicleLabels = ['car', 'truck', 'bus', 'motorcycle', 'bicycle', 'vehicle'];
    if (vehicleLabels.includes(label.toLowerCase())) {
      return `Vehicle detected${trackId !== undefined ? `, ID ${trackId}` : ''}.`;
    }

    return `${capLabel} detected${trackId !== undefined ? `, tracking ID ${trackId}` : ''}.`;
  }

  // -----------------------------------------------------------
  // Announce via Backend (pyttsx3)
  // -----------------------------------------------------------
  private async announceViaBackend(text: string, volume: number): Promise<boolean> {
    try {
      const res = await fetch(`${this.backendUrl}/api/voice/announce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, volume }),
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // -----------------------------------------------------------
  // Announce via Browser (Web Speech API)
  // -----------------------------------------------------------
  private announceViaBrowser(text: string, volume: number): boolean {
    if (!('speechSynthesis' in window)) return false;
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = Math.max(0, Math.min(1, volume));
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      // Prefer a natural-sounding voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') ||
            v.name.includes('Neural') ||
            v.name.includes('Google'))
      );
      if (preferred) utterance.voice = preferred;

      window.speechSynthesis.speak(utterance);
      return true;
    } catch {
      return false;
    }
  }

  // -----------------------------------------------------------
  // Main Announce Method (async, non-blocking)
  // -----------------------------------------------------------
  async announce(opts: {
    label: string;
    trackId?: number;
    zone?: string;
    confidence?: number;
    force?: boolean;
  }): Promise<void> {
    if (!this.enabled && !opts.force) return;

    if (!opts.force && this.isInCooldown(opts.label, opts.trackId)) return;

    this.markAnnounced(opts.label, opts.trackId);

    const text = this.buildPhrase(
      opts.label,
      opts.trackId,
      opts.zone,
      opts.confidence
    );

    // Run asynchronously — do not block
    void (async () => {
      let success = false;

      if (this.useBackend) {
        success = await this.announceViaBackend(text, this.volume);
        if (!success) {
          this.useBackend = false; // fall back to browser
        }
      }

      if (!success) {
        success = this.announceViaBrowser(text, this.volume);
      }

      if (!success) {
        this.updateStatus('error');
      } else {
        if (this.enabled) this.updateStatus('active');
      }
    })();
  }

  // -----------------------------------------------------------
  // Test Voice
  // -----------------------------------------------------------
  async testVoice(): Promise<void> {
    await this.announce({
      label: 'test',
      force: true,
    });
  }

  // -----------------------------------------------------------
  // Clear all cooldowns
  // -----------------------------------------------------------
  clearCooldowns() {
    this.cooldowns = {};
  }
}

// Singleton export
export const voiceManager = new VoiceManager();
