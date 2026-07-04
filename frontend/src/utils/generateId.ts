// ============================================================
// VisionAI — ID Generator Utility
// ============================================================

let _counter = 0;

export function generateId(prefix = 'id'): string {
  _counter += 1;
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${Date.now()}_${_counter}_${rand}`;
}
