// ============================================================
// VisionAI Phase 7C — Alert Center Page
// ============================================================
import { Bell, Volume2, Camera, Shield, Activity, Zap } from 'lucide-react';
import { useVisionStore } from '../../store/useVisionStore';
import { AlertPanel } from '../panels/AlertPanel';
import { AlertRulesEditor } from '../panels/AlertRulesEditor';
import { VoiceControls } from '../panels/VoiceControls';
import { Badge } from '../ui/Badge';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { format } from 'date-fns';

function RecentAlerts() {
  const events = useVisionStore((s) => s.events);
  const dangerous = events.filter((e) => e.severity === 'danger' || e.severity === 'warning').slice(0, 10);

  return (
    <Card glass glow="amber">
      <CardHeader
        action={<Badge variant="warning">{dangerous.length} recent</Badge>}
      >
        <Zap className="h-4 w-4 text-amber-400" />
        <span className="text-sm font-semibold text-slate-200">Recent High-Priority Alerts</span>
      </CardHeader>
      <CardBody>
        {dangerous.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-16 text-slate-500 gap-1">
            <Activity className="h-6 w-6 opacity-30" />
            <p className="text-xs">No high-priority alerts yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dangerous.map((e) => (
              <div
                key={e.id}
                className={`flex items-center gap-3 rounded-lg border p-2.5 ${
                  e.severity === 'danger'
                    ? 'border-red-500/30 bg-red-500/8'
                    : 'border-amber-500/30 bg-amber-500/8'
                }`}
              >
                <div className={`h-2 w-2 flex-shrink-0 rounded-full ${
                  e.severity === 'danger' ? 'bg-red-500' : 'bg-amber-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold capitalize text-slate-200">{e.object}</span>
                    {e.trackId !== undefined && (
                      <span className="text-[10px] text-slate-500">#{e.trackId}</span>
                    )}
                    {e.zone && (
                      <Badge variant={e.severity} className="text-[9px]">{e.zone}</Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {Math.round(e.confidence * 100)}% confidence · {e.ruleMatched ?? 'No rule'}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-slate-500 flex-shrink-0">
                  {format(e.timestamp, 'HH:mm:ss')}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function AlertCenterPage() {
  const { alertPanel, settings } = useVisionStore();

  const summaryCards = [
    {
      label: 'Total Alerts',
      value: alertPanel.alertCount,
      icon: <Bell className="h-5 w-5" />,
      color: 'text-violet-400',
      bg: 'bg-violet-500/10 border-violet-500/20',
      glow: 'shadow-violet-500/20',
    },
    {
      label: 'Voice Status',
      value: settings.voice.enabled ? 'Active' : 'Muted',
      icon: <Volume2 className="h-5 w-5" />,
      color: settings.voice.enabled ? 'text-emerald-400' : 'text-slate-500',
      bg: settings.voice.enabled ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-700/30 border-slate-700/30',
      glow: 'shadow-emerald-500/10',
    },
    {
      label: 'Screenshots',
      value: settings.autoScreenshot.enabled ? settings.autoScreenshot.mode.replace('_', ' ') : 'Disabled',
      icon: <Camera className="h-5 w-5" />,
      color: settings.autoScreenshot.enabled ? 'text-blue-400' : 'text-slate-500',
      bg: settings.autoScreenshot.enabled ? 'bg-blue-500/10 border-blue-500/20' : 'bg-slate-700/30 border-slate-700/30',
      glow: '',
    },
    {
      label: 'Active Rules',
      value: settings.alertRules.filter((r) => r.enabled).length,
      icon: <Shield className="h-5 w-5" />,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      glow: '',
    },
  ];

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600/20 border border-red-500/30">
          <Bell className="h-4 w-4 text-red-400" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-100">Alert Center</h1>
          <p className="text-[11px] text-slate-400">Monitor all alerts, voice settings, and screenshot automation</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map((c) => (
          <div
            key={c.label}
            className={`flex items-center gap-3 rounded-xl border p-4 shadow-lg ${c.bg} ${c.glow}`}
          >
            <span className={c.color}>{c.icon}</span>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">{c.label}</p>
              <p className={`text-sm font-bold capitalize ${c.color}`}>{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-4">
          <AlertPanel />
          <VoiceControls />
        </div>

        {/* Middle Column */}
        <div className="space-y-4">
          <AlertRulesEditor />
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <RecentAlerts />
        </div>
      </div>
    </div>
  );
}
