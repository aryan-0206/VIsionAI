// ============================================================
// VisionAI Phase 7C — Settings Page
// ============================================================
import { Settings } from 'lucide-react';
import { SettingsPanel } from '../panels/SettingsPanel';

export function SettingsPage() {
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-700/40 border border-slate-600/30">
          <Settings className="h-4 w-4 text-slate-400" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-100">Settings</h1>
          <p className="text-[11px] text-slate-400">
            Configure backend connection, voice, screenshots, notifications, and detection filters
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <SettingsPanel />
      </div>
    </div>
  );
}
