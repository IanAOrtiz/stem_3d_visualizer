// Central registry for scene plan schemas.
// Schemas are registered explicitly by [concept][version]. No fallback or guessing.

import * as harmonicOscillatorV1 from "./scene/harmonic_oscillator.v1";
import * as dampedOscillatorV1 from "./scene/damped_oscillator.v1";
import * as drivenOscillatorV1 from "./scene/driven_oscillator.v1";
import * as coupledOscillators2MassV1 from "./scene/coupled_oscillators_2mass.v1";
import * as projectileMotionV1 from "./scene/projectile_motion.v1";
import * as uniformCircularMotionV1 from "./scene/uniform_circular_motion.v1";
import * as keplerTwoBodyOrbitV1 from "./scene/kepler_two_body_orbit.v1";
import * as laminarInternalFlowV1 from "./scene/laminar_internal_flow.v1";
import * as fluidSystemV1 from "./scene/fluid_system.v1";

export type ParameterControlClass = "read_only" | "runtime_tunable" | "plan_tunable" | "locked";

export interface ParameterControlSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  controlClass: ParameterControlClass;
  requiresValidation: boolean;
}

/** Shape every registered schema must conform to. */
export interface SceneSchema {
  schemaId: string;
  schemaVersion: string;
  normalize: (rawParams: Record<string, unknown>) => Record<string, unknown>;
  validateStructure: (canonicalParams: any) => string[];
  contracts: Array<(canonicalParams: any) => string | null>;
  parameterControlSpecs: ParameterControlSpec[];
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
      parameterControlSpecs: harmonicOscillatorV1.parameterControlSpecs,
    },
  },
  [dampedOscillatorV1.schemaId]: {
    [dampedOscillatorV1.schemaVersion]: {
      schemaId: dampedOscillatorV1.schemaId,
      schemaVersion: dampedOscillatorV1.schemaVersion,
      normalize: dampedOscillatorV1.normalize,
      validateStructure: dampedOscillatorV1.validateStructure,
      contracts: dampedOscillatorV1.contracts,
      parameterControlSpecs: dampedOscillatorV1.parameterControlSpecs,
    },
  },
  [drivenOscillatorV1.schemaId]: {
    [drivenOscillatorV1.schemaVersion]: {
      schemaId: drivenOscillatorV1.schemaId,
      schemaVersion: drivenOscillatorV1.schemaVersion,
      normalize: drivenOscillatorV1.normalize,
      validateStructure: drivenOscillatorV1.validateStructure,
      contracts: drivenOscillatorV1.contracts,
      parameterControlSpecs: drivenOscillatorV1.parameterControlSpecs,
    },
  },
  [coupledOscillators2MassV1.schemaId]: {
    [coupledOscillators2MassV1.schemaVersion]: {
      schemaId: coupledOscillators2MassV1.schemaId,
      schemaVersion: coupledOscillators2MassV1.schemaVersion,
      normalize: coupledOscillators2MassV1.normalize,
      validateStructure: coupledOscillators2MassV1.validateStructure,
      contracts: coupledOscillators2MassV1.contracts,
      parameterControlSpecs: coupledOscillators2MassV1.parameterControlSpecs,
    },
  },
  [projectileMotionV1.schemaId]: {
    [projectileMotionV1.schemaVersion]: {
      schemaId: projectileMotionV1.schemaId,
      schemaVersion: projectileMotionV1.schemaVersion,
      normalize: projectileMotionV1.normalize,
      validateStructure: projectileMotionV1.validateStructure,
      contracts: projectileMotionV1.contracts,
      parameterControlSpecs: projectileMotionV1.parameterControlSpecs,
    },
  },
  [uniformCircularMotionV1.schemaId]: {
    [uniformCircularMotionV1.schemaVersion]: {
      schemaId: uniformCircularMotionV1.schemaId,
      schemaVersion: uniformCircularMotionV1.schemaVersion,
      normalize: uniformCircularMotionV1.normalize,
      validateStructure: uniformCircularMotionV1.validateStructure,
      contracts: uniformCircularMotionV1.contracts,
      parameterControlSpecs: uniformCircularMotionV1.parameterControlSpecs,
    },
  },
  [keplerTwoBodyOrbitV1.schemaId]: {
    [keplerTwoBodyOrbitV1.schemaVersion]: {
      schemaId: keplerTwoBodyOrbitV1.schemaId,
      schemaVersion: keplerTwoBodyOrbitV1.schemaVersion,
      normalize: keplerTwoBodyOrbitV1.normalize,
      validateStructure: keplerTwoBodyOrbitV1.validateStructure,
      contracts: keplerTwoBodyOrbitV1.contracts,
      parameterControlSpecs: keplerTwoBodyOrbitV1.parameterControlSpecs,
    },
  },
  [laminarInternalFlowV1.schemaId]: {
    [laminarInternalFlowV1.schemaVersion]: {
      schemaId: laminarInternalFlowV1.schemaId,
      schemaVersion: laminarInternalFlowV1.schemaVersion,
      normalize: laminarInternalFlowV1.normalize,
      validateStructure: laminarInternalFlowV1.validateStructure,
      contracts: laminarInternalFlowV1.contracts,
      parameterControlSpecs: laminarInternalFlowV1.parameterControlSpecs,
    },
  },
  [fluidSystemV1.schemaId]: {
    [fluidSystemV1.schemaVersion]: {
      schemaId: fluidSystemV1.schemaId,
      schemaVersion: fluidSystemV1.schemaVersion,
      normalize: fluidSystemV1.normalize,
      validateStructure: fluidSystemV1.validateStructure,
      contracts: fluidSystemV1.contracts,
      parameterControlSpecs: [],
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
