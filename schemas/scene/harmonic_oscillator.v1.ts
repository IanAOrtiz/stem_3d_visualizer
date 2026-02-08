// Schema definition for harmonic oscillator scenes.
// Defines canonical parameter shape, normalization rules, structural validation, and contracts.

export const schemaId = "harmonic_oscillator" as const;
export const schemaVersion = "v1" as const;

export interface CanonicalParams {
  amplitude: number;
  frequency: number;
  phase: number;
  [key: string]: unknown;
}

// Allowed raw input keys and their canonical mapping.
const PARAM_MAP: Record<string, keyof CanonicalParams> = {
  amplitude: "amplitude",
  A: "amplitude",
  frequency: "frequency",
  f: "frequency",
  phase: "phase",
};

/**
 * Normalize raw user/AI parameters into canonical form.
 * Throws on unknown keys or missing required parameters.
 */
export function normalize(rawParams: Record<string, unknown>): CanonicalParams {
  const result: Partial<CanonicalParams> = {};
  const seen = new Set<keyof CanonicalParams>();

  for (const key of Object.keys(rawParams)) {
    const canonical = PARAM_MAP[key];
    if (canonical === undefined) {
      throw new Error(`Unknown parameter: "${key}". Allowed: ${Object.keys(PARAM_MAP).join(", ")}`);
    }
    if (seen.has(canonical)) {
      throw new Error(`Duplicate mapping for "${canonical}" via key "${key}".`);
    }
    seen.add(canonical);
    result[canonical] = rawParams[key] as number;
  }

  // Required parameters.
  if (result.amplitude === undefined) {
    throw new Error('Missing required parameter: "amplitude" (or alias "A").');
  }
  if (result.frequency === undefined) {
    throw new Error('Missing required parameter: "frequency" (or alias "f").');
  }

  // Default phase to 0.
  if (result.phase === undefined) {
    result.phase = 0;
  }

  return result as CanonicalParams;
}

/**
 * Validate structural integrity of canonical parameters.
 * Returns an array of error strings (empty if valid).
 */
export function validateStructure(params: CanonicalParams): string[] {
  const errors: string[] = [];

  if (typeof params.amplitude !== "number" || Number.isNaN(params.amplitude)) {
    errors.push("amplitude must be a finite number.");
  }
  if (typeof params.frequency !== "number" || Number.isNaN(params.frequency)) {
    errors.push("frequency must be a finite number.");
  }
  if (typeof params.phase !== "number" || Number.isNaN(params.phase)) {
    errors.push("phase must be a finite number.");
  }

  return errors;
}

/**
 * Semantic contracts. Each returns an error string or null.
 */
export const contracts: Array<(params: CanonicalParams) => string | null> = [
  (p) => (p.amplitude > 0 ? null : `amplitude must be > 0, got ${p.amplitude}.`),
  (p) => (p.frequency > 0 ? null : `frequency must be > 0, got ${p.frequency}.`),
];
