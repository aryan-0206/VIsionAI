// ============================================================
// VisionAI Phase 7C — Voice Controls Panel
// ============================================================
import { Volume2, VolumeX, Zap, Clock, RefreshCw } from 'lucide-react';
import { useVisionStore } from '../../store/useVisionStore';
import { voiceManager } from '../../services/voiceManager';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Toggle } from '../ui/Toggle';
import { Slider } from '../ui/Slider';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export function VoiceControls() {
  const { settings, updateVoiceSettings, alertPanel, updateVoiceStatus } = useVisionStore();
  const { voice } = settings;

  function handleToggle(enabled: boolean) {
    updateVoiceSettings({ enabled });
    voiceManager.setEnabled(enabled);
    updateVoiceStatus(enabled ? 'active' : 'muted');
  }

  function handleVolume(volume: number) {
    updateVoiceSettings({ volume });
    voiceManager.setVolume(volume);
  }

  function handleCooldown(cooldownSeconds: number) {
    updateVoiceSettings({ cooldownSeconds });
    voiceManager.setCooldown(cooldownSeconds);
  }

  async function handleTest() {
    await voiceManager.testVoice();
  }

  function handleClearCooldowns() {
    voiceManager.clearCooldowns();
  }

  return (
    <Card glass glow="green">
      <CardHeader
        action={
          <Badge
            variant={alertPanel.voiceStatus === 'active' ? 'success' : alertPanel.voiceStatus === 'error' ? 'danger' : 'neutral'}
            dot
            pulse={voice.enabled && alertPanel.voiceStatus === 'active'}
          >
            {alertPanel.voiceStatus === 'active' ? 'Active' : alertPanel.voiceStatus === 'muted' ? 'Muted' : 'Error'}
          </Badge>
        }
      >
        <Volume2 className="h-4 w-4 text-emerald-400" />
        <span className="text-sm font-semibold text-slate-200">Voice Alerts</span>
      </CardHeader>

      <CardBody className="space-y-4">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between rounded-lg bg-slate-800/40 px-3 py-2.5">
          <div className="flex items-center gap-2">
            {voice.enabled ? (
              <Volume2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-slate-500" />
            )}
            <div>
              <p className="text-xs font-medium text-slate-200">Voice Announcements</p>
              <p className="text-[10px] text-slate-500">pyttsx3 (offline TTS)</p>
            </div>
          </div>
          <Toggle
            checked={voice.enabled}
            onChange={handleToggle}
            size="md"
            color="green"
          />
        </div>

        {/* Volume */}
        <Slider
          label="Volume"
          value={voice.volume}
          onChange={handleVolume}
          min={0}
          max={100}
          step={5}
          unit="%"
          color="green"
        />

        {/* Cooldown */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-slate-400" />
              <span className="text-xs font-medium text-slate-300">Cooldown Period</span>
            </div>
            <span className="text-xs font-semibold text-slate-200">{voice.cooldownSeconds}s</span>
          </div>
          <Slider
            value={voice.cooldownSeconds}
            onChange={handleCooldown}
            min={0}
            max={60}
            step={1}
            color="violet"
          />
          <p className="text-[10px] text-slate-500">
            Suppress repeated announcements for the same object within this period.
          </p>
        </div>

        {/* Example phrases */}
        <div className="rounded-lg bg-slate-800/40 p-3 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Example Phrases</p>
          {[
            '"Person detected, tracking ID 3."',
            '"Vehicle detected."',
            '"Restricted area intrusion! Person detected."',
            '"Dog detected in Zone A."',
          ].map((phrase) => (
            <p key={phrase} className="text-[10px] text-slate-400 font-mono leading-relaxed">{phrase}</p>
          ))}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="success"
            icon={<Zap className="h-3.5 w-3.5" />}
            onClick={() => void handleTest()}
          >
            Test Voice
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={handleClearCooldowns}
          >
            Clear Cooldowns
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
