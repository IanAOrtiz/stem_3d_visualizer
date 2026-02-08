// Central registry for scene plan schemas.
// Schemas are registered explicitly by [concept][version]. No fallback or guessing.

import * as harmonicOscillatorV1 from "./scene/harmonic_oscillator.v1";

/** Shape every registered schema must conform to. */
export interface SceneSchema {
  schemaId: string;
  schemaVersion: string;
  normalize: (rawParams: Record<string, unknown>) => Record<string, unknown>;
  validateStructure: (canonicalParams: any) => string[];
  contracts: Array<(canonicalParams: any) => string | null>;
}

// Explicit two-level map: concept -> version -> schema.
const registry: Record<string, Record<string, SceneSchema>> = {
  [harmonicOscillatorV1.schemaId]: {
    [harmonicOscillatorV1.schemaVersion]: {
      schemaId: harmonicOscillatorV1.schemaId,
      schemaVersion: harmonicOscillatorV1.schemaVersion,
      normalize: harmonicOscillatorV1.normalize,
      validateStructure: harmonicOscillatorV1.validateStructure,
      contracts: harmonicOscillatorV1.contracts,
    },
  },
};

/**
 * Look up a schema by concept and version.
 * Returns the schema if found, null otherwise. Never guesses.
 */
export function getSchema(concept: string, version: string): SceneSchema | null {
  return registry[concept]?.[version] ?? null;
}
