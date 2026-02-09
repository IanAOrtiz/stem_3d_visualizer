export type ControlClass = 'read_only' | 'runtime_tunable' | 'plan_tunable' | 'locked';

export interface ParameterControlSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  controlClass: ControlClass;
  requiresValidation: boolean;
}

export interface ResolvedParameterControl extends ParameterControlSpec {
  value: number;
}

/**
 * Read parameter control specs directly from the scene plan object.
 * Specs are served by the backend — no hardcoded frontend copy.
 */
export function resolveParameterControls(scenePlan: any): ResolvedParameterControl[] {
  if (!scenePlan || typeof scenePlan !== 'object') return [];

  const specs: ParameterControlSpec[] = scenePlan.parameterControlSpecs;
  if (!Array.isArray(specs) || specs.length === 0) return [];

  const params = scenePlan?.parameters && typeof scenePlan.parameters === 'object'
    ? scenePlan.parameters
    : {};

  const resolved: ResolvedParameterControl[] = [];
  for (const spec of specs) {
    if (spec.controlClass === 'locked') continue;
    const value = params[spec.key];
    if (typeof value !== 'number' || Number.isNaN(value)) continue;
    resolved.push({
      ...spec,
      value,
    });
  }
  return resolved;
}

export function createParameterPatch(
  original: ResolvedParameterControl[],
  nextValues: Record<string, number>,
): Record<string, number> {
  const patch: Record<string, number> = {};
  for (const control of original) {
    const next = nextValues[control.key];
    if (typeof next !== 'number' || Number.isNaN(next)) continue;
    if (Math.abs(next - control.value) > 1e-9) {
      patch[control.key] = next;
    }
  }
  return patch;
}
