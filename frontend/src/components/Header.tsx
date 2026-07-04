// ============================================================
// VisionAI Phase 7C — Top Header Bar
// ============================================================
import { Bell, Volume2, VolumeX, Camera, Wifi, WifiOff, Clock, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { useVisionStore } from '../store/useVisionStore';
import { voiceManager } from '../services/voiceManager';
import { Badge } from './ui/Badge';

export function Header() {
  const {
    backendConnected,
    alertPanel,
    settings,
    updateVoiceSettings,
    isStreaming,
  } = useVisionStore();

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  function toggleVoice() {
    const next = !settings.voice.enabled;
    updateVoiceSettings({ enabled: next });
    voiceManager.setEnabled(next);
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-700/50 bg-slate-900/80 px-4 backdrop-blur-xl">
      {/* Left: Status indicators */}
      <div className="flex items-center gap-4">
        {/* Connection */}
        <div className="flex items-center gap-1.5">
          {backendConnected ? (
            <Wifi className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-red-400" />
          )}
          <span className={`text-xs font-medium ${backendConnected ? 'text-emerald-400' : 'text-red-400'}`}>
            {backendConnected ? 'Live' : 'Demo'}
          </span>
        </div>

        {/* Streaming */}
        {isStreaming && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            <span className="text-xs font-semibold text-red-400">DETECTING</span>
          </div>
        )}

        {/* Alert count */}
        {alertPanel.alertCount > 0 && (
          <div className="flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5 text-amber-400" />
            <Badge variant="warning" className="text-[10px]">
              {alertPanel.alertCount} alerts
            </Badge>
          </div>
        )}
      </div>

      {/* Center: App name */}
      <div className="flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-violet-400" />
        <span className="text-sm font-semibold text-slate-300">
          VisionAI
        </span>
      </div>

      {/* Right: Quick controls + clock */}
      <div className="flex items-center gap-3">
        {/* Voice toggle */}
        <button
          onClick={toggleVoice}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${
            settings.voice.enabled
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
              : 'border-slate-700/50 bg-slate-800/60 text-slate-500 hover:text-slate-300'
          }`}
          title={settings.voice.enabled ? 'Disable voice' : 'Enable voice'}
        >
          {settings.voice.enabled ? (
            <Volume2 className="h-3.5 w-3.5" />
          ) : (
            <VolumeX className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">
            {settings.voice.enabled ? 'Voice On' : 'Voice Off'}
          </span>
        </button>

        {/* Screenshot status */}
        <button
          onClick={() => useVisionStore.getState().updateScreenshotSettings({
            enabled: !settings.autoScreenshot.enabled,
          })}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${
            settings.autoScreenshot.enabled
              ? 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'
              : 'border-slate-700/50 bg-slate-800/60 text-slate-500 hover:text-slate-300'
          }`}
          title={settings.autoScreenshot.enabled ? 'Disable auto-screenshot' : 'Enable auto-screenshot'}
        >
          <Camera className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {settings.autoScreenshot.enabled ? 'Auto SS' : 'SS Off'}
          </span>
        </button>

        {/* Clock */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-mono">{format(time, 'HH:mm:ss')}</span>
        </div>
      </div>
    </header>
  );
}
