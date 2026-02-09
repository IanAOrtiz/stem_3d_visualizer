import { z } from "zod";
import { Constraints } from "../pillars/constraints";
import { Interval1DDomain } from "../pillars/domain";
import { NoForcing } from "../pillars/forcing";
import { IdealSpringMaterial } from "../pillars/material";
import { ParticleEnsembleState } from "../pillars/state";
import { WaveEquationEvolution } from "../pillars/evolution";
import type { ParameterControlSpec } from "../schemaRegistry";

export const schemaId = "coupled_oscillators_2mass" as const;
export const schemaVersion = "v1" as const;

const PositiveFiniteNumber = z.number().finite().positive();
const FiniteNumber = z.number().finite();

export const CoupledOscillators2Mass = z.object({
  mass: PositiveFiniteNumber,
  anchorStiffness: PositiveFiniteNumber,
  couplingStiffness: PositiveFiniteNumber,
  amplitude1: PositiveFiniteNumber,
  amplitude2: PositiveFiniteNumber,
  phaseOffset: FiniteNumber,
}).strict();

const CoupledOscillatorsAssembly = z.object({
  state: ParticleEnsembleState,
  domain: Interval1DDomain,
  material: IdealSpringMaterial,
  constraints: Constraints,
  forcing: NoForcing,
  evolution: WaveEquationEvolution,
}).strict();

export interface CanonicalParams {
  mass: number;
  anchorStiffness: number;
  couplingStiffness: number;
  amplitude1: number;
  amplitude2: number;
  phaseOffset: number;
  [key: string]: unknown;
}

export const parameterControlSpecs: ParameterControlSpec[] = [
  {
    key: "mass",
    label: "Mass",
    min: 0.1,
    max: 20,
    step: 0.1,
    unit: "kg",
    controlClass: "plan_tunable",
    requiresValidation: true,
  },
  {
    key: "anchorStiffness",
    label: "Anchor Stiffness",
    min: 0.1,
    max: 200,
    step: 0.1,
    unit: "N/m",
    controlClass: "plan_tunable",
    requiresValidation: true,
  },
  {
    key: "couplingStiffness",
    label: "Coupling Stiffness",
    min: 0.1,
    max: 200,
    step: 0.1,
    unit: "N/m",
    controlClass: "plan_tunable",
    requiresValidation: true,
  },
  {
    key: "amplitude1",
    label: "Amplitude 1",
    min: 0.01,
    max: 10,
    step: 0.01,
    unit: "m",
    controlClass: "runtime_tunable",
    requiresValidation: false,
  },
  {
    key: "amplitude2",
    label: "Amplitude 2",
    min: 0.01,
    max: 10,
    step: 0.01,
    unit: "m",
    controlClass: "runtime_tunable",
    requiresValidation: false,
  },
  {
    key: "phaseOffset",
    label: "Phase Offset",
    min: -6.2832,
    max: 6.2832,
    step: 0.01,
    unit: "rad",
    controlClass: "runtime_tunable",
    requiresValidation: false,
  },
];

const PARAM_MAP: Record<string, keyof CanonicalParams> = {
  mass: "mass",
  m: "mass",
  anchorStiffness: "anchorStiffness",
  kAnchor: "anchorStiffness",
  couplingStiffness: "couplingStiffness",
  kCoupling: "couplingStiffness",
  amplitude1: "amplitude1",
  A1: "amplitude1",
  amplitude2: "amplitude2",
  A2: "amplitude2",
  phaseOffset: "phaseOffset",
  deltaPhase: "phaseOffset",
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

  if (result.mass === undefined) {
    result.mass = 1;
  }
  if (result.anchorStiffness === undefined) {
    throw new Error('Missing required parameter: "anchorStiffness" (or alias "kAnchor").');
  }
  if (result.couplingStiffness === undefined) {
    throw new Error('Missing required parameter: "couplingStiffness" (or alias "kCoupling").');
  }
  if (result.amplitude1 === undefined) {
    throw new Error('Missing required parameter: "amplitude1" (or alias "A1").');
  }
  if (result.amplitude2 === undefined) {
    result.amplitude2 = result.amplitude1;
  }
  if (result.phaseOffset === undefined) {
    result.phaseOffset = 0;
  }

  return result as CanonicalParams;
}

export function validateStructure(params: CanonicalParams): string[] {
  const errors: string[] = [];

  const canonicalResult = CoupledOscillators2Mass.safeParse(params);
  if (!canonicalResult.success) {
    errors.push(
      ...canonicalResult.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    );
    return errors;
  }

  const assemblyResult = CoupledOscillatorsAssembly.safeParse(buildCoupledAssembly(params));
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
  (p) => (p.mass > 0 ? null : `mass must be > 0, got ${p.mass}.`),
  (p) => (p.anchorStiffness > 0 ? null : `anchorStiffness must be > 0, got ${p.anchorStiffness}.`),
  (p) => (p.couplingStiffness > 0 ? null : `couplingStiffness must be > 0, got ${p.couplingStiffness}.`),
  (p) => {
    const assembly = buildCoupledAssembly(p);
    if (assembly.state.kind !== "particle_ensemble" || assembly.state.count !== 2) {
      return "coupled_oscillators_2mass requires particle_ensemble state with count=2.";
    }
    if (assembly.domain.kind !== "interval_1d") {
      return `coupled_oscillators_2mass requires domain kind "interval_1d", got "${assembly.domain.kind}".`;
    }
    if (assembly.material.kind !== "ideal_spring") {
      return `coupled_oscillators_2mass requires material kind "ideal_spring", got "${assembly.material.kind}".`;
    }
    if (assembly.forcing.kind !== "none") {
      return `coupled_oscillators_2mass requires forcing kind "none", got "${assembly.forcing.kind}".`;
    }
    if (assembly.evolution.kind !== "wave_equation") {
      return `coupled_oscillators_2mass requires evolution kind "wave_equation", got "${assembly.evolution.kind}".`;
    }
    return null;
  },
  (p) => {
    const assembly = buildCoupledAssembly(p);
    const fixedCount = assembly.constraints.filter((constraint) => constraint.type === "fixed").length;
    if (fixedCount < 2) {
      return "coupled_oscillators_2mass requires two fixed anchor constraints.";
    }
    const hasCoupling = assembly.constraints.some(
      (constraint) => constraint.type === "specified_value" && constraint.quantity === "couplingStiffness",
    );
    if (!hasCoupling) {
      return "coupled_oscillators_2mass requires a specified couplingStiffness constraint.";
    }
    return null;
  },
];

export type CoupledOscillators2Mass = z.infer<typeof CoupledOscillators2Mass>;

function buildCoupledAssembly(params: CanonicalParams) {
  const characteristicLength = 4 * Math.max(params.amplitude1, params.amplitude2);
  const waveSpeed = Math.sqrt(params.couplingStiffness / params.mass);

  return {
    state: {
      kind: "particle_ensemble" as const,
      count: 2,
      particleMass: params.mass,
    },
    domain: {
      kind: "interval_1d" as const,
      characteristicLength,
      dimensions: {
        length: characteristicLength,
      },
      orientation: {
        axis: "x" as const,
        direction: "positive" as const,
      },
    },
    material: {
      kind: "ideal_spring" as const,
      stiffness: params.anchorStiffness,
      dampingRatio: 0,
    },
    constraints: [
      {
        type: "fixed" as const,
        target: "left_anchor",
      },
      {
        type: "fixed" as const,
        target: "right_anchor",
      },
      {
        type: "specified_value" as const,
        target: "coupling",
        quantity: "couplingStiffness",
        value: params.couplingStiffness,
      },
      {
        type: "specified_value" as const,
        target: "mode.phaseOffset",
        quantity: "phaseOffset",
        value: params.phaseOffset,
      },
    ],
    forcing: {
      kind: "none" as const,
    },
    evolution: {
      kind: "wave_equation" as const,
      waveSpeed,
      transient: true,
    },
  };
}
