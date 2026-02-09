import { z } from "zod";
import { Constraints } from "../pillars/constraints";
import { Box3DDomain } from "../pillars/domain";
import { UniformCircularEvolution } from "../pillars/evolution";
import { NoForcing } from "../pillars/forcing";
import { InertialParticleMaterial } from "../pillars/material";
import { PointMassState } from "../pillars/state";
import type { ParameterControlSpec } from "../schemaRegistry";

export const schemaId = "uniform_circular_motion" as const;
export const schemaVersion = "v1" as const;

const PositiveFiniteNumber = z.number().finite().positive();
const FiniteNumber = z.number().finite();

export const UniformCircularMotion = z.object({
  radius: PositiveFiniteNumber,
  angularSpeed: PositiveFiniteNumber,
  phase: FiniteNumber,
  mass: PositiveFiniteNumber,
  plane: z.enum(["xy", "xz", "yz"]),
}).strict();

const UniformCircularAssembly = z.object({
  state: PointMassState,
  domain: Box3DDomain,
  material: InertialParticleMaterial,
  constraints: Constraints,
  forcing: NoForcing,
  evolution: UniformCircularEvolution,
}).strict();

export interface CanonicalParams {
  radius: number;
  angularSpeed: number;
  phase: number;
  mass: number;
  plane: "xy" | "xz" | "yz";
  [key: string]: unknown;
}

export const parameterControlSpecs: ParameterControlSpec[] = [
  {
    key: "radius",
    label: "Radius",
    min: 0.05,
    max: 50,
    step: 0.05,
    unit: "m",
    controlClass: "runtime_tunable",
    requiresValidation: false,
  },
  {
    key: "angularSpeed",
    label: "Angular Speed",
    min: 0.05,
    max: 50,
    step: 0.05,
    unit: "rad/s",
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
    key: "mass",
    label: "Mass",
    min: 0.1,
    max: 100,
    step: 0.1,
    unit: "kg",
    controlClass: "plan_tunable",
    requiresValidation: true,
  },
];

const PARAM_MAP: Record<string, keyof CanonicalParams> = {
  radius: "radius",
  r: "radius",
  angularSpeed: "angularSpeed",
  omega: "angularSpeed",
  phase: "phase",
  mass: "mass",
  m: "mass",
  plane: "plane",
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

  if (result.radius === undefined) {
    throw new Error('Missing required parameter: "radius" (or alias "r").');
  }
  if (result.angularSpeed === undefined) {
    throw new Error('Missing required parameter: "angularSpeed" (or alias "omega").');
  }
  if (result.phase === undefined) {
    result.phase = 0;
  }
  if (result.mass === undefined) {
    result.mass = 1;
  }
  if (result.plane === undefined) {
    result.plane = "xy";
  }

  return result as CanonicalParams;
}

export function validateStructure(params: CanonicalParams): string[] {
  const errors: string[] = [];

  const canonicalResult = UniformCircularMotion.safeParse(params);
  if (!canonicalResult.success) {
    errors.push(
      ...canonicalResult.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    );
    return errors;
  }

  const assemblyResult = UniformCircularAssembly.safeParse(buildUniformCircularAssembly(params));
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
  (p) => (p.radius > 0 ? null : `radius must be > 0, got ${p.radius}.`),
  (p) => (p.angularSpeed > 0 ? null : `angularSpeed must be > 0, got ${p.angularSpeed}.`),
  (p) => {
    const assembly = buildUniformCircularAssembly(p);
    if (assembly.state.kind !== "point_mass" || assembly.state.dof !== "3d") {
      return "uniform_circular_motion requires a 3D point_mass state.";
    }
    if (assembly.domain.kind !== "box_3d") {
      return `uniform_circular_motion requires domain kind "box_3d", got "${assembly.domain.kind}".`;
    }
    if (assembly.material.kind !== "inertial_particle") {
      return `uniform_circular_motion requires material kind "inertial_particle", got "${assembly.material.kind}".`;
    }
    if (assembly.forcing.kind !== "none") {
      return `uniform_circular_motion requires forcing kind "none", got "${assembly.forcing.kind}".`;
    }
    if (assembly.evolution.kind !== "uniform_circular") {
      return `uniform_circular_motion requires evolution kind "uniform_circular", got "${assembly.evolution.kind}".`;
    }
    return null;
  },
  (p) => {
    const assembly = buildUniformCircularAssembly(p);
    const hasPeriodicConstraint = assembly.constraints.some((constraint) => constraint.type === "periodic");
    if (!hasPeriodicConstraint) {
      return "uniform_circular_motion requires a periodic trajectory constraint.";
    }
    return null;
  },
];

export type UniformCircularMotion = z.infer<typeof UniformCircularMotion>;

function buildUniformCircularAssembly(params: CanonicalParams) {
  const size = Math.max(params.radius * 4, 1);

  return {
    state: {
      kind: "point_mass" as const,
      dof: "3d" as const,
      mass: params.mass,
    },
    domain: {
      kind: "box_3d" as const,
      characteristicLength: size,
      dimensions: {
        width: size,
        height: size,
        depth: size,
      },
      orientation: {
        axis: "z" as const,
        direction: "positive" as const,
      },
    },
    material: {
      kind: "inertial_particle" as const,
      dragCoefficient: 0,
    },
    constraints: [
      {
        type: "periodic" as const,
        target: "trajectory",
        pairedTarget: "trajectory_start",
      },
      {
        type: "specified_value" as const,
        target: "orbit.radius",
        quantity: "radius",
        value: params.radius,
      },
    ],
    forcing: {
      kind: "none" as const,
    },
    evolution: {
      kind: "uniform_circular" as const,
      transient: true,
      plane: params.plane,
    },
  };
}
