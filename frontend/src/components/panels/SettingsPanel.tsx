// ============================================================
// VisionAI Phase 7C — Settings Panel
// ============================================================
import { Settings, Camera, Bell, Download, RotateCcw, Save, Server } from 'lucide-react';
import { useState } from 'react';
import { useVisionStore } from '../../store/useVisionStore';
import { screenshotManager } from '../../services/screenshotManager';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Toggle } from '../ui/Toggle';
import { Slider } from '../ui/Slider';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import type { ScreenshotMode } from '../../types';

const screenshotModes: { value: ScreenshotMode; label: string; description: string }[] = [
  { value: 'every_detection', label: 'Every Detection',  description: 'Capture on each detection event' },
  { value: 'person_only',     label: 'Person Only',      description: 'Only when a person is detected' },
  { value: 'vehicle_only',    label: 'Vehicle Only',     description: 'Only when a vehicle is detected' },
  { value: 'intrusion_only',  label: 'Intrusion Only',   description: 'Only restricted zone events' },
  { value: 'manual_only',     label: 'Manual Only',      description: 'Use the manual capture button' },
];

export function SettingsPanel() {
  const {
    settings,
    updateScreenshotSettings,
    updateNotificationSettings,
    updateDetectionSettings,
    backendUrl,
    setBackendUrl,
    resetSettings,
    backendConnected,
  } = useVisionStore();

  const [urlInput, setUrlInput] = useState(backendUrl);
  const [saved, setSaved] = useState(false);

  function handleSaveBackend() {
    setBackendUrl(urlInput);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleScreenshotMode(mode: ScreenshotMode) {
    updateScreenshotSettings({ mode });
    screenshotManager.configure({ mode });
  }

  function handleExportSettings() {
    const data = JSON.stringify(settings, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'visionai_settings.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Backend Connection */}
      <Card glass>
        <CardHeader
          action={
            <Badge variant={backendConnected ? 'success' : 'danger'} dot pulse={backendConnected}>
              {backendConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          }
        >
          <Server className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-200">Backend Connection</span>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="http://localhost:5000"
              className="flex-1 rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500/50"
            />
            <Button size="sm" variant={saved ? 'success' : 'primary'} onClick={handleSaveBackend}>
              {saved ? 'Saved!' : 'Save'}
            </Button>
          </div>
          <p className="text-[10px] text-slate-500">
            Flask backend URL for pyttsx3 voice, screenshot capture, and detection APIs.
          </p>
        </CardBody>
      </Card>

      {/* Screenshot Settings */}
      <Card glass>
        <CardHeader>
          <Camera className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-semibold text-slate-200">Auto Screenshot</span>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-200">Enable Auto Screenshot</p>
              <p className="text-[10px] text-slate-500">Saves to {settings.autoScreenshot.savePath}</p>
            </div>
            <Toggle
              checked={settings.autoScreenshot.enabled}
              onChange={(v) => {
                updateScreenshotSettings({ enabled: v });
                screenshotManager.configure({ enabled: v });
              }}
              color="blue"
            />
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Capture Mode</p>
            <div className="space-y-1.5">
              {screenshotModes.map((m) => (
                <button
                  key={m.value}
                  onClick={() => handleScreenshotMode(m.value)}
                  className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                    settings.autoScreenshot.mode === m.value
                      ? 'border-blue-500/40 bg-blue-500/10'
                      : 'border-slate-700/30 bg-slate-800/30 hover:border-slate-600/50'
                  }`}
                >
                  <div>
                    <p className={`text-xs font-medium ${settings.autoScreenshot.mode === m.value ? 'text-blue-300' : 'text-slate-300'}`}>
                      {m.label}
                    </p>
                    <p className="text-[10px] text-slate-500">{m.description}</p>
                  </div>
                  {settings.autoScreenshot.mode === m.value && (
                    <div className="h-2 w-2 rounded-full bg-blue-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Notification Settings */}
      <Card glass>
        <CardHeader>
          <Bell className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-semibold text-slate-200">Notifications</span>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-200">Enable Toast Notifications</p>
            <Toggle
              checked={settings.notifications.enabled}
              onChange={(v) => updateNotificationSettings({ enabled: v })}
              color="amber"
            />
          </div>

          <Slider
            label="Toast Duration"
            value={settings.notifications.duration / 1000}
            onChange={(v) => updateNotificationSettings({ duration: v * 1000 })}
            min={2}
            max={15}
            step={1}
            unit="s"
            color="amber"
          />

          <Slider
            label="Max Visible Toasts"
            value={settings.notifications.maxVisible}
            onChange={(v) => updateNotificationSettings({ maxVisible: v })}
            min={1}
            max={10}
            step={1}
            color="amber"
          />
        </CardBody>
      </Card>

      {/* Detection Settings */}
      <Card glass>
        <CardHeader>
          <Settings className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-200">Detection Filters</span>
        </CardHeader>
        <CardBody className="space-y-3">
          <Slider
            label="Min Confidence Threshold"
            value={Math.round(settings.detection.minConfidence * 100)}
            onChange={(v) => updateDetectionSettings({ minConfidence: v / 100 })}
            min={10}
            max={99}
            step={1}
            unit="%"
            color="violet"
          />
          <p className="text-[10px] text-slate-500">
            Detections below this confidence will be ignored by alert rules.
          </p>

          <Slider
            label="Event Log Max Entries"
            value={settings.eventLog.maxEntries}
            onChange={(_v) => useVisionStore.getState().updateDetectionSettings({ minConfidence: settings.detection.minConfidence })}
            min={50}
            max={500}
            step={50}
            color="violet"
          />
        </CardBody>
      </Card>

      {/* Export / Reset */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<Download className="h-3.5 w-3.5" />}
          onClick={handleExportSettings}
          className="flex-1"
        >
          Export Settings
        </Button>
        <Button
          variant="danger"
          size="sm"
          icon={<RotateCcw className="h-3.5 w-3.5" />}
          onClick={resetSettings}
          className="flex-1"
        >
          Reset All
        </Button>
      </div>
    </div>
  );
}

// Keep import used
const _Save = Save;
void _Save;
