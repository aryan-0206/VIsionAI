// ============================================================
// VisionAI Phase 7C — Alert Rules Editor
// ============================================================
import { useState } from 'react';
import {
  Shield, Plus, Trash2, Edit3, Check, X, Volume2,
  Camera, AlertTriangle, ChevronDown, ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useVisionStore } from '../../store/useVisionStore';
import { alertRuleEngine } from '../../services/alertRuleEngine';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import type { AlertRule, AlertCondition, AlertSeverity, AlertConditionType } from '../../types';

const CONDITION_LABELS: Record<AlertConditionType, string> = {
  any:               'Any Detection',
  label:             'Object Label',
  confidence_above:  'Confidence Above',
  confidence_below:  'Confidence Below',
  inside_roi:        'Inside ROI',
  inside_zone:       'Inside Zone',
};

const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; color: string; bg: string }> = {
  info:    { label: 'Info',    color: 'text-blue-400',    bg: 'bg-blue-500/15 border-blue-500/30' },
  success: { label: 'Success', color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  warning: { label: 'Warning', color: 'text-amber-400',   bg: 'bg-amber-500/15 border-amber-500/30' },
  danger:  { label: 'Danger',  color: 'text-red-400',     bg: 'bg-red-500/15 border-red-500/30' },
};

const COMMON_LABELS = ['person', 'car', 'truck', 'bus', 'bicycle', 'motorcycle', 'dog', 'cat', 'vehicle'];

// -----------------------------------------------------------
// New Rule Form
// -----------------------------------------------------------
interface NewRuleFormProps {
  onClose: () => void;
}

function NewRuleForm({ onClose }: NewRuleFormProps) {
  const { addAlertRule } = useVisionStore();
  const [name, setName] = useState('');
  const [severity, setSeverity] = useState<AlertSeverity>('warning');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [screenshotEnabled, setScreenshotEnabled] = useState(false);
  const [conditions, setConditions] = useState<AlertCondition[]>([{ type: 'label', value: 'person' }]);
  const [errors, setErrors] = useState<string[]>([]);

  function addCondition() {
    setConditions([...conditions, { type: 'label', value: '' }]);
  }

  function updateCondition(i: number, patch: Partial<AlertCondition>) {
    setConditions(conditions.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }

  function removeCondition(i: number) {
    setConditions(conditions.filter((_, idx) => idx !== i));
  }

  function handleSave() {
    const result = alertRuleEngine.validateRule({ name, conditions, severity, voiceEnabled, screenshotEnabled, enabled: true });
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    addAlertRule({ name, conditions, severity, voiceEnabled, screenshotEnabled, enabled: true });
    onClose();
  }

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-3">
      <p className="text-sm font-semibold text-violet-300">New Alert Rule</p>

      {errors.length > 0 && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-2 space-y-1">
          {errors.map((e, i) => (
            <p key={i} className="text-xs text-red-400">• {e}</p>
          ))}
        </div>
      )}

      {/* Rule name */}
      <input
        type="text"
        placeholder="Rule name (e.g. Person in Restricted Zone)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500/50"
      />

      {/* Severity */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Severity</p>
        <div className="flex gap-1.5 flex-wrap">
          {(Object.keys(SEVERITY_CONFIG) as AlertSeverity[]).map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={cn(
                'rounded-lg border px-2.5 py-1 text-xs font-medium transition',
                severity === s ? SEVERITY_CONFIG[s].bg + ' ' + SEVERITY_CONFIG[s].color : 'border-slate-700/50 text-slate-500 hover:text-slate-300'
              )}
            >
              {SEVERITY_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Conditions */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Conditions (AND)</p>
          <button onClick={addCondition} className="text-[10px] text-violet-400 hover:text-violet-300 flex items-center gap-1">
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {conditions.map((cond, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={cond.type}
                onChange={(e) => updateCondition(i, { type: e.target.value as AlertConditionType, value: '' })}
                className="rounded-lg border border-slate-700/50 bg-slate-800/80 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-violet-500/50"
              >
                {(Object.keys(CONDITION_LABELS) as AlertConditionType[]).map((t) => (
                  <option key={t} value={t}>{CONDITION_LABELS[t]}</option>
                ))}
              </select>

              {cond.type === 'label' && (
                <div className="flex-1 flex gap-1">
                  <input
                    type="text"
                    placeholder="label (e.g. person)"
                    value={String(cond.value ?? '')}
                    onChange={(e) => updateCondition(i, { value: e.target.value })}
                    className="flex-1 rounded-lg border border-slate-700/50 bg-slate-800/60 px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500/50"
                  />
                  <select
                    value=""
                    onChange={(e) => updateCondition(i, { value: e.target.value })}
                    className="rounded-lg border border-slate-700/50 bg-slate-800/80 px-1 py-1.5 text-xs text-slate-400 outline-none"
                  >
                    <option value="">Quick</option>
                    {COMMON_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}

              {(cond.type === 'confidence_above' || cond.type === 'confidence_below') && (
                <input
                  type="number"
                  min="0" max="100" step="5"
                  placeholder="e.g. 80"
                  value={String(cond.value ?? '')}
                  onChange={(e) => updateCondition(i, { value: e.target.value })}
                  className="flex-1 rounded-lg border border-slate-700/50 bg-slate-800/60 px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500/50"
                />
              )}

              {cond.type === 'inside_zone' && (
                <input
                  type="text"
                  placeholder="zone name"
                  value={String(cond.value ?? '')}
                  onChange={(e) => updateCondition(i, { value: e.target.value })}
                  className="flex-1 rounded-lg border border-slate-700/50 bg-slate-800/60 px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-violet-500/50"
                />
              )}

              {(cond.type === 'any' || cond.type === 'inside_roi') && (
                <span className="flex-1 text-xs text-slate-500 italic">No value required</span>
              )}

              <button onClick={() => removeCondition(i)} className="text-slate-600 hover:text-red-400 transition">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="flex gap-4">
        <Toggle checked={voiceEnabled} onChange={setVoiceEnabled} label="Voice Alert" size="sm" color="green" />
        <Toggle checked={screenshotEnabled} onChange={setScreenshotEnabled} label="Auto Screenshot" size="sm" color="blue" />
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button size="sm" variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSave}>
          Save Rule
        </Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------
// Rule Card
// -----------------------------------------------------------
function RuleCard({ rule }: { rule: AlertRule }) {
  const { toggleAlertRule, deleteAlertRule } = useVisionStore();
  const [expanded, setExpanded] = useState(false);
  const cfg = SEVERITY_CONFIG[rule.severity];

  return (
    <div
      className={cn(
        'rounded-lg border transition-all',
        rule.enabled
          ? `${cfg.bg} ${cfg.color}`
          : 'border-slate-700/30 bg-slate-800/30 text-slate-500'
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <Toggle checked={rule.enabled} onChange={() => toggleAlertRule(rule.id)} size="sm" color="violet" />

        <div className="flex-1 min-w-0">
          <p className={cn('text-xs font-semibold truncate', rule.enabled ? cfg.color : 'text-slate-400')}>
            {rule.name}
          </p>
          <p className="text-[10px] text-slate-500">
            {rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''}
            {rule.voiceEnabled && ' · Voice'}
            {rule.screenshotEnabled && ' · SS'}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {rule.voiceEnabled && <Volume2 className="h-3 w-3 text-slate-400" />}
          {rule.screenshotEnabled && <Camera className="h-3 w-3 text-slate-400" />}
          <Badge variant={rule.severity}>{cfg.label}</Badge>
          <button onClick={() => setExpanded(!expanded)} className="text-slate-500 hover:text-slate-300 transition">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => deleteAlertRule(rule.id)} className="text-slate-600 hover:text-red-400 transition">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-700/30 px-3 pb-3 pt-2 space-y-1">
          {rule.conditions.map((cond, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="rounded bg-slate-700/60 px-1.5 py-0.5 font-mono">
                {CONDITION_LABELS[cond.type]}
              </span>
              {cond.value !== undefined && cond.value !== '' && (
                <span className="text-slate-300">{String(cond.value)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------
// Main Editor
// -----------------------------------------------------------
export function AlertRulesEditor() {
  const { settings, resetAlertRules } = useVisionStore();
  const [showForm, setShowForm] = useState(false);
  const rules = settings.alertRules;

  return (
    <Card glass glow="blue">
      <CardHeader
        action={
          <div className="flex items-center gap-1.5">
            <Badge variant="neutral">{rules.filter((r) => r.enabled).length}/{rules.length} active</Badge>
            <Button
              size="xs"
              variant="ghost"
              icon={<RotateCcw className="h-3 w-3" />}
              onClick={resetAlertRules}
              title="Reset to defaults"
            >
              Reset
            </Button>
            <Button
              size="xs"
              variant="primary"
              icon={<Plus className="h-3 w-3" />}
              onClick={() => setShowForm(!showForm)}
            >
              New Rule
            </Button>
          </div>
        }
      >
        <Shield className="h-4 w-4 text-blue-400" />
        <span className="text-sm font-semibold text-slate-200">Alert Rules</span>
      </CardHeader>

      <CardBody className="space-y-3">
        {showForm && <NewRuleForm onClose={() => setShowForm(false)} />}

        {rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-20 text-slate-500 gap-2">
            <AlertTriangle className="h-6 w-6 opacity-30" />
            <p className="text-xs">No rules defined. Add one above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <RuleCard key={rule.id} rule={rule} />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

// Fix unused import
const _Edit3 = Edit3;
void _Edit3;
