// ============================================================
// VisionAI Phase 7C — Alert Rule Engine
// Evaluates detection events against user-defined alert rules.
// ============================================================

import type { AlertRule, AlertCondition, Detection, AlertSeverity } from '../types';

export interface RuleMatchResult {
  matched: boolean;
  rule?: AlertRule;
  severity?: AlertSeverity;
}

class AlertRuleEngine {
  // -----------------------------------------------------------
  // Evaluate a single condition against a detection
  // -----------------------------------------------------------
  private evaluateCondition(
    condition: AlertCondition,
    detection: Detection
  ): boolean {
    switch (condition.type) {
      case 'any':
        return true;

      case 'label': {
        if (!condition.value) return false;
        const labelVal = String(condition.value).toLowerCase();
        const detLabel = detection.label.toLowerCase();

        // Vehicle group
        const vehicleLabels = ['car', 'truck', 'bus', 'motorcycle', 'bicycle', 'van', 'vehicle'];
        if (labelVal === 'vehicle') {
          return vehicleLabels.includes(detLabel);
        }

        return detLabel === labelVal || detLabel.includes(labelVal);
      }

      case 'confidence_above': {
        const threshold = Number(condition.value ?? 0);
        return detection.confidence >= threshold / 100;
      }

      case 'confidence_below': {
        const threshold = Number(condition.value ?? 100);
        return detection.confidence < threshold / 100;
      }

      case 'inside_roi':
        // ROI check — delegate to zone field from backend
        return detection.zone !== undefined && detection.zone !== '';

      case 'inside_zone': {
        if (!condition.value || !detection.zone) return false;
        const zoneVal = String(condition.value).toLowerCase();
        return detection.zone.toLowerCase().includes(zoneVal);
      }

      default:
        return false;
    }
  }

  // -----------------------------------------------------------
  // Evaluate ALL conditions for a rule (AND logic)
  // -----------------------------------------------------------
  private evaluateRule(rule: AlertRule, detection: Detection): boolean {
    if (!rule.enabled) return false;
    if (rule.conditions.length === 0) return true;

    return rule.conditions.every((cond) =>
      this.evaluateCondition(cond, detection)
    );
  }

  // -----------------------------------------------------------
  // Run detection against all rules, return FIRST match
  // (highest severity wins if multiple match)
  // -----------------------------------------------------------
  evaluate(rules: AlertRule[], detection: Detection): RuleMatchResult {
    const severityOrder: AlertSeverity[] = ['danger', 'warning', 'success', 'info'];
    let bestMatch: AlertRule | undefined;
    let bestSeverityIdx = severityOrder.length;

    for (const rule of rules) {
      if (this.evaluateRule(rule, detection)) {
        const idx = severityOrder.indexOf(rule.severity);
        if (idx < bestSeverityIdx) {
          bestSeverityIdx = idx;
          bestMatch = rule;
        }
      }
    }

    if (!bestMatch) return { matched: false };

    return {
      matched: true,
      rule: bestMatch,
      severity: bestMatch.severity,
    };
  }

  // -----------------------------------------------------------
  // Check if detection passes minimum confidence filter
  // -----------------------------------------------------------
  meetsMinConfidence(detection: Detection, minConfidence: number): boolean {
    return detection.confidence >= minConfidence;
  }

  // -----------------------------------------------------------
  // Validate a rule before saving
  // -----------------------------------------------------------
  validateRule(rule: Partial<AlertRule>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rule.name || rule.name.trim() === '') {
      errors.push('Rule name is required.');
    }

    if (!rule.conditions || rule.conditions.length === 0) {
      errors.push('At least one condition is required.');
    }

    if (rule.conditions) {
      for (const cond of rule.conditions) {
        if (cond.type === 'label' && !cond.value) {
          errors.push('Label condition requires a value.');
        }
        if (cond.type === 'confidence_above' || cond.type === 'confidence_below') {
          const val = Number(cond.value);
          if (isNaN(val) || val < 0 || val > 100) {
            errors.push('Confidence threshold must be 0–100.');
          }
        }
        if (cond.type === 'inside_zone' && !cond.value) {
          errors.push('Zone condition requires a zone name.');
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

export const alertRuleEngine = new AlertRuleEngine();
