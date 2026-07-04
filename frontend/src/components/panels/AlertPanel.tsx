// ============================================================
// VisionAI Phase 7C — Alert Panel
// ============================================================
import {
  Bell, Volume2, VolumeX, Camera, AlertTriangle,
  CheckCircle2, XOctagon, Info, Zap, Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../utils/cn';
import { useVisionStore } from '../../store/useVisionStore';
import { voiceManager } from '../../services/voiceManager';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

const severityIcon = {
  info:    <Info className="h-4 w-4 text-blue-400" />,
  success: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-400" />,
  danger:  <XOctagon className="h-4 w-4 text-red-400" />,
};

export function AlertPanel() {
  const { alertPanel, settings, updateVoiceSettings, updateScreenshotSettings } = useVisionStore();

  const voiceEnabled = settings.voice.enabled;
  const screenshotEnabled = settings.autoScreenshot.enabled;

  function handleTestVoice() {
    void voiceManager.testVoice();
  }

  function toggleVoice() {
    updateVoiceSettings({ enabled: !voiceEnabled });
    voiceManager.setEnabled(!voiceEnabled);
  }

  function toggleScreenshot() {
    updateScreenshotSettings({ enabled: !screenshotEnabled });
  }

  const stats = [
    {
      label: 'Total Alerts',
      value: alertPanel.alertCount,
      icon: <Bell className="h-4 w-4" />,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10',
    },
    {
      label: 'Active Now',
      value: alertPanel.activeAlerts,
      icon: <Zap className="h-4 w-4" />,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Voice',
      value: voiceEnabled ? 'ON' : 'OFF',
      icon: voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />,
      color: voiceEnabled ? 'text-emerald-400' : 'text-slate-500',
      bg: voiceEnabled ? 'bg-emerald-500/10' : 'bg-slate-700/40',
    },
    {
      label: 'Screenshots',
      value: screenshotEnabled ? 'ON' : 'OFF',
      icon: <Camera className="h-4 w-4" />,
      color: screenshotEnabled ? 'text-blue-400' : 'text-slate-500',
      bg: screenshotEnabled ? 'bg-blue-500/10' : 'bg-slate-700/40',
    },
  ];

  return (
    <Card glass glow="purple">
      <CardHeader
        action={
          <Badge
            variant={alertPanel.voiceStatus === 'active' ? 'success' : alertPanel.voiceStatus === 'error' ? 'danger' : 'neutral'}
            dot
            pulse={alertPanel.voiceStatus === 'active'}
          >
            {alertPanel.voiceStatus === 'active' ? 'Voice Active' : alertPanel.voiceStatus === 'muted' ? 'Muted' : 'Error'}
          </Badge>
        }
      >
        <Bell className="h-4 w-4 text-violet-400" />
        <span className="text-sm font-semibold text-slate-200">Alert Center</span>
      </CardHeader>

      <CardBody className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          {stats.map((s) => (
            <div key={s.label} className={cn('flex items-center gap-2.5 rounded-lg px-3 py-2.5', s.bg)}>
              <span className={s.color}>{s.icon}</span>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{s.label}</p>
                <p className={cn('text-sm font-bold', s.color)}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Last Alert */}
        {alertPanel.lastAlert && (
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-3 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Last Alert</p>
            <div className="flex items-center gap-2">
              {severityIcon[alertPanel.lastAlert.severity]}
              <span className="text-sm font-semibold text-slate-200 capitalize">
                {alertPanel.lastAlert.object}
              </span>
              {alertPanel.lastAlert.trackId !== undefined && (
                <Badge variant="neutral" className="text-[10px]">
                  #{alertPanel.lastAlert.trackId}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span>{Math.round(alertPanel.lastAlert.confidence * 100)}% confidence</span>
              {alertPanel.lastAlert.zone && (
                <span className="text-amber-400">● {alertPanel.lastAlert.zone}</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              <Clock className="h-2.5 w-2.5" />
              {format(alertPanel.lastAlert.timestamp, 'MMM d, HH:mm:ss')}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Quick Controls</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant={voiceEnabled ? 'success' : 'secondary'}
              icon={voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              onClick={toggleVoice}
            >
              {voiceEnabled ? 'Voice On' : 'Voice Off'}
            </Button>

            <Button
              size="sm"
              variant="secondary"
              icon={<Zap className="h-3.5 w-3.5 text-amber-400" />}
              onClick={handleTestVoice}
            >
              Test Voice
            </Button>

            <Button
              size="sm"
              variant={screenshotEnabled ? 'primary' : 'secondary'}
              icon={<Camera className="h-3.5 w-3.5" />}
              onClick={toggleScreenshot}
            >
              {screenshotEnabled ? 'Auto SS On' : 'Auto SS Off'}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              icon={<Bell className="h-3.5 w-3.5" />}
              onClick={() => useVisionStore.getState().clearToasts()}
            >
              Clear Toasts
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
