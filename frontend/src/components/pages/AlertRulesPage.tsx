// ============================================================
// VisionAI Phase 7C — Alert Rules Page
// ============================================================
import { Shield } from 'lucide-react';
import { AlertRulesEditor } from '../panels/AlertRulesEditor';
import { VoiceControls } from '../panels/VoiceControls';

export function AlertRulesPage() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 border border-blue-500/30">
          <Shield className="h-4 w-4 text-blue-400" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-100">Alert Rules</h1>
          <p className="text-[11px] text-slate-400">
            Configure detection conditions, voice alerts, and auto-screenshot triggers
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AlertRulesEditor />
        <VoiceControls />
      </div>
    </div>
  );
}
