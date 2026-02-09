import { z } from "zod";
import { Constraints } from "../pillars/constraints";
import { Interval1DDomain } from "../pillars/domain";
import { DampedShmEvolution } from "../pillars/evolution";
import { HarmonicDriveForcing } from "../pillars/forcing";
import { IdealSpringMaterial } from "../pillars/material";
import { PointMassState } from "../pillars/state";
import type { ParameterControlSpec } from "../schemaRegistry";

export const schemaId = "driven_oscillator" as const;
export const schemaVersion = "v1" as const;

const PositiveFiniteNumber = z.number().finite().positive();
const NonNegativeFiniteNumber = z.number().finite().min(0);
const FiniteNumber = z.number().finite();

export const DrivenOscillator = z.object({
  amplitude: PositiveFiniteNumber,
  naturalFrequency: PositiveFiniteNumber,
  driveAmplitude: PositiveFiniteNumber,
  driveFrequency: PositiveFiniteNumber,
  dampingRatio: NonNegativeFiniteNumber,
  phase: FiniteNumber,
  drivePhase: FiniteNumber,
}).strict();

const DrivenOscillatorAssembly = z.object({
  state: PointMassState,
  domain: Interval1DDomain,
  material: IdealSpringMaterial,
  constraints: Constraints,
  forcing: HarmonicDriveForcing,
  evolution: DampedShmEvolution,
}).strict();

export interface CanonicalParams {
  amplitude: number;
  naturalFrequency: number;
  driveAmplitude: number;
  driveFrequency: number;
  dampingRatio: number;
  phase: number;
  drivePhase: number;
  [key: string]: unknown;
}

export const parameterControlSpecs: ParameterControlSpec[] = [
  {
    key: "amplitude",
    label: "Base Amplitude",
    min: 0.05,
    max: 10,
    step: 0.05,
    unit: "m",
    controlClass: "runtime_tunable",
    requiresValidation: false,
  },
  {
    key: "naturalFrequency",
    label: "Natural Frequency",
    min: 0.05,
    max: 20,
    step: 0.05,
    unit: "Hz",
    controlClass: "runtime_tunable",
    requiresValidation: false,
  },
  {
    key: "driveAmplitude",
    label: "Drive Amplitude",
    min: 0.01,
    max: 10,
    step: 0.01,
    unit: "m",
    controlClass: "runtime_tunable",
    requiresValidation: false,
  },
  {
    key: "driveFrequency",
    label: "Drive Frequency",
    min: 0.05,
    max: 20,
    step: 0.05,
    unit: "Hz",
    controlClass: "runtime_tunable",
    requiresValidation: false,
  },
  {
    key: "dampingRatio",
    label: "Damping Ratio",
    min: 0,
    max: 2,
    step: 0.01,
    controlClass: "runtime_tunable",
    requiresValidation: false,
  },
  {
    key: "phase",
    label: "Phase",
    min: -6.2832,
    max: 6.2832,
    step: 0.01,
    unit: "rad",
    controlClass: "runtime_tunable",
    requiresValidation: false,
  },
  {
    key: "drivePhase",
    label: "Drive Phase",
    min: -6.2832,
    max: 6.2832,
    step: 0.01,
    unit: "rad",
    controlClass: "runtime_tunable",
    requiresValidation: false,
  },
];

const PARAM_MAP: Record<string, keyof CanonicalParams> = {
  amplitude: "amplitude",
  A: "amplitude",
  naturalFrequency: "naturalFrequency",
  fn: "naturalFrequency",
  driveAmplitude: "driveAmplitude",
  Ad: "driveAmplitude",
  driveFrequency: "driveFrequency",
  fd: "driveFrequency",
  dampingRatio: "dampingRatio",
  zeta: "dampingRatio",
  phase: "phase",
  drivePhase: "drivePhase",
};

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
    result[canonical] = rawParams[key] as never;
  }

  if (result.amplitude === undefined) {
    throw new Error('Missing required parameter: "amplitude" (or alias "A").');
  }
  if (result.naturalFrequency === undefined) {
    throw new Error('Missing required parameter: "naturalFrequency" (or alias "fn").');
  }
  if (result.driveAmplitude === undefined) {
    result.driveAmplitude = result.amplitude;
  }
  if (result.driveFrequency === undefined) {
    result.driveFrequency = result.naturalFrequency;
  }
  if (result.dampingRatio === undefined) {
    result.dampingRatio = 0.05;
  }
  if (result.phase === undefined) {
    result.phase = 0;
  }
  if (result.drivePhase === undefined) {
    result.drivePhase = 0;
  }

  return result as CanonicalParams;
}

export function validateStructure(params: CanonicalParams): string[] {
  const errors: string[] = [];

  const canonicalResult = DrivenOscillator.safeParse(params);
  if (!canonicalResult.success) {
    errors.push(
      ...canonicalResult.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    );
    return errors;
  }

  const assemblyResult = DrivenOscillatorAssembly.safeParse(buildDrivenAssembly(params));
  if (!assemblyResult.success) {
    errors.push(
      ...assemblyResult.error.issues.map(
        (issue) => `assembly.${issue.path.join(".")}: ${issue.message}`,
      ),
    );
  }

  return errors;
}

export const contracts: Array<(params: CanonicalParams) => string | null> = [
  (p) => (p.amplitude > 0 ? null : `amplitude must be > 0, got ${p.amplitude}.`),
  (p) => (p.naturalFrequency > 0 ? null : `naturalFrequency must be > 0, got ${p.naturalFrequency}.`),
  (p) => (p.driveAmplitude > 0 ? null : `driveAmplitude must be > 0, got ${p.driveAmplitude}.`),
  (p) => (p.driveFrequency > 0 ? null : `driveFrequency must be > 0, got ${p.driveFrequency}.`),
  (p) => (p.dampingRatio >= 0 ? null : `dampingRatio must be >= 0, got ${p.dampingRatio}.`),
  (p) => {
    const assembly = buildDrivenAssembly(p);
    if (assembly.evolution.kind !== "damped_shm") {
      return `driven_oscillator requires evolution kind "damped_shm", got "${assembly.evolution.kind}".`;
    }
    if (assembly.state.kind !== "point_mass" || assembly.state.dof !== "1d") {
      return 'driven_oscillator requires state kind "point_mass" with dof "1d".';
    }
    if (assembly.domain.kind !== "interval_1d") {
      return `driven_oscillator requires domain kind "interval_1d", got "${assembly.domain.kind}".`;
    }
    if (assembly.material.kind !== "ideal_spring") {
      return `driven_oscillator requires material kind "ideal_spring", got "${assembly.material.kind}".`;
    }
    if (assembly.forcing.kind !== "harmonic_drive") {
      return `driven_oscillator requires forcing kind "harmonic_drive", got "${assembly.forcing.kind}".`;
    }
    return null;
  },
  (p) => {
    const assembly = buildDrivenAssembly(p);
    const hasFixedConstraint = assembly.constraints.some((constraint) => constraint.type === "fixed");
    if (!hasFixedConstraint) {
      return "driven_oscillator requires at least one fixed constraint.";
    }
    return null;
  },
];

export type DrivenOscillator = z.infer<typeof DrivenOscillator>;

function buildDrivenAssembly(params: CanonicalParams) {
  const mass = 1;
  const omega = 2 * Math.PI * params.naturalFrequency;
  const stiffness = mass * omega * omega;
  const baseAmplitude = Math.max(params.amplitude, params.driveAmplitude);
  const length = baseAmplitude * 2;

  return {
    state: {
      kind: "point_mass" as const,
      dof: "1d" as const,
      mass,
    },
    domain: {
      kind: "interval_1d" as const,
      characteristicLength: length,
      dimensions: {
        length,
      },
      orientation: {
        axis: "x" as const,
        direction: "positive" as const,
      },
    },
    material: {
      kind: "ideal_spring" as const,
      stiffness,
      dampingRatio: params.dampingRatio,
    },
    constraints: [
      {
        type: "fixed" as const,
        target: "origin",
      },
      {
        type: "specified_value" as const,
        target: "state.phase",
        quantity: "phase",
        value: params.phase,
      },
    ],
    forcing: {
      kind: "harmonic_drive" as const,
      amplitude: params.driveAmplitude,
      frequency: params.driveFrequency,
      phase: params.drivePhase,
    },
    evolution: {
      kind: "damped_shm" as const,
      dampingRatio: params.dampingRatio,
    },
  };
}
