import { z } from "zod";
import { Constraints } from "../pillars/constraints";
import { Interval1DDomain } from "../pillars/domain";
import { DampedShmEvolution } from "../pillars/evolution";
import { NoForcing } from "../pillars/forcing";
import { IdealSpringMaterial } from "../pillars/material";
import { PointMassState } from "../pillars/state";
import type { ParameterControlSpec } from "../schemaRegistry";

export const schemaId = "damped_oscillator" as const;
export const schemaVersion = "v1" as const;

const PositiveFiniteNumber = z.number().finite().positive();
const NonNegativeFiniteNumber = z.number().finite().min(0);
const FiniteNumber = z.number().finite();

export const DampedOscillator = z.object({
  amplitude: PositiveFiniteNumber,
  frequency: PositiveFiniteNumber,
  dampingRatio: NonNegativeFiniteNumber,
  phase: FiniteNumber,
}).strict();

const DampedOscillatorAssembly = z.object({
  state: PointMassState,
  domain: Interval1DDomain,
  material: IdealSpringMaterial,
  constraints: Constraints,
  forcing: NoForcing,
  evolution: DampedShmEvolution,
}).strict();

export interface CanonicalParams {
  amplitude: number;
  frequency: number;
  dampingRatio: number;
  phase: number;
  [key: string]: unknown;
}

export const parameterControlSpecs: ParameterControlSpec[] = [
  {
    key: "amplitude",
    label: "Amplitude",
    min: 0.05,
    max: 10,
    step: 0.05,
    unit: "m",
    controlClass: "runtime_tunable",
    requiresValidation: false,
  },
  {
    key: "frequency",
    label: "Frequency",
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
];

const PARAM_MAP: Record<string, keyof CanonicalParams> = {
  amplitude: "amplitude",
  A: "amplitude",
  frequency: "frequency",
  f: "frequency",
  dampingRatio: "dampingRatio",
  zeta: "dampingRatio",
  phase: "phase",
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
  if (result.frequency === undefined) {
    throw new Error('Missing required parameter: "frequency" (or alias "f").');
  }

  if (result.dampingRatio === undefined) {
    result.dampingRatio = 0.05;
  }
  if (result.phase === undefined) {
    result.phase = 0;
  }

  return result as CanonicalParams;
}

export function validateStructure(params: CanonicalParams): string[] {
  const errors: string[] = [];

  const canonicalResult = DampedOscillator.safeParse(params);
  if (!canonicalResult.success) {
    errors.push(
      ...canonicalResult.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    );
    return errors;
  }

  const assemblyResult = DampedOscillatorAssembly.safeParse(buildDampedAssembly(params));
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
  (p) => (p.frequency > 0 ? null : `frequency must be > 0, got ${p.frequency}.`),
  (p) => (p.dampingRatio >= 0 ? null : `dampingRatio must be >= 0, got ${p.dampingRatio}.`),
  (p) => {
    const assembly = buildDampedAssembly(p);
    if (assembly.evolution.kind !== "damped_shm") {
      return `damped_oscillator requires evolution kind "damped_shm", got "${assembly.evolution.kind}".`;
    }
    if (assembly.state.kind !== "point_mass" || assembly.state.dof !== "1d") {
      return 'damped_oscillator requires state kind "point_mass" with dof "1d".';
    }
    if (assembly.domain.kind !== "interval_1d") {
      return `damped_oscillator requires domain kind "interval_1d", got "${assembly.domain.kind}".`;
    }
    if (assembly.material.kind !== "ideal_spring") {
      return `damped_oscillator requires material kind "ideal_spring", got "${assembly.material.kind}".`;
    }
    if (assembly.forcing.kind !== "none") {
      return `damped_oscillator requires forcing kind "none", got "${assembly.forcing.kind}".`;
    }
    return null;
  },
  (p) => {
    const assembly = buildDampedAssembly(p);
    const hasFixedConstraint = assembly.constraints.some((constraint) => constraint.type === "fixed");
    if (!hasFixedConstraint) {
      return "damped_oscillator requires at least one fixed constraint.";
    }
    return null;
  },
];

export type DampedOscillator = z.infer<typeof DampedOscillator>;

function buildDampedAssembly(params: CanonicalParams) {
  const mass = 1;
  const omega = 2 * Math.PI * params.frequency;
  const stiffness = mass * omega * omega;
  const length = params.amplitude * 2;

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
      kind: "none" as const,
    },
    evolution: {
      kind: "damped_shm" as const,
      dampingRatio: params.dampingRatio,
    },
  };
}
