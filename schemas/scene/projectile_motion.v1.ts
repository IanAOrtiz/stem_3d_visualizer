import { z } from "zod";
import { Constraints } from "../pillars/constraints";
import { Rect2DDomain } from "../pillars/domain";
import { KinematicEvolution } from "../pillars/evolution";
import { ConstantFieldForcing } from "../pillars/forcing";
import { InertialParticleMaterial } from "../pillars/material";
import { PointMassState } from "../pillars/state";
import type { ParameterControlSpec } from "../schemaRegistry";

export const schemaId = "projectile_motion" as const;
export const schemaVersion = "v1" as const;

const PositiveFiniteNumber = z.number().finite().positive();
const NonNegativeFiniteNumber = z.number().finite().min(0);

export const ProjectileMotion = z.object({
  initialSpeed: PositiveFiniteNumber,
  launchAngleDeg: z.number().finite().gt(0).lt(90),
  gravity: PositiveFiniteNumber,
  initialHeight: NonNegativeFiniteNumber,
  mass: PositiveFiniteNumber,
  dragCoefficient: NonNegativeFiniteNumber,
}).strict();

const ProjectileAssembly = z.object({
  state: PointMassState,
  domain: Rect2DDomain,
  material: InertialParticleMaterial,
  constraints: Constraints,
  forcing: ConstantFieldForcing,
  evolution: KinematicEvolution,
}).strict();

export interface CanonicalParams {
  initialSpeed: number;
  launchAngleDeg: number;
  gravity: number;
  initialHeight: number;
  mass: number;
  dragCoefficient: number;
  [key: string]: unknown;
}

export const parameterControlSpecs: ParameterControlSpec[] = [
  {
    key: "initialSpeed",
    label: "Initial Speed",
    min: 0.1,
    max: 200,
    step: 0.1,
    unit: "m/s",
    controlClass: "runtime_tunable",
    requiresValidation: false,
  },
  {
    key: "launchAngleDeg",
    label: "Launch Angle",
    min: 1,
    max: 89,
    step: 0.1,
    unit: "deg",
    controlClass: "runtime_tunable",
    requiresValidation: false,
  },
  {
    key: "gravity",
    label: "Gravity",
    min: 0.1,
    max: 50,
    step: 0.1,
    unit: "m/s^2",
    controlClass: "runtime_tunable",
    requiresValidation: false,
  },
  {
    key: "initialHeight",
    label: "Initial Height",
    min: 0,
    max: 200,
    step: 0.1,
    unit: "m",
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
  {
    key: "dragCoefficient",
    label: "Drag Coefficient",
    min: 0,
    max: 2,
    step: 0.01,
    controlClass: "runtime_tunable",
    requiresValidation: false,
  },
];

const PARAM_MAP: Record<string, keyof CanonicalParams> = {
  initialSpeed: "initialSpeed",
  v0: "initialSpeed",
  launchAngleDeg: "launchAngleDeg",
  thetaDeg: "launchAngleDeg",
  gravity: "gravity",
  g: "gravity",
  initialHeight: "initialHeight",
  h0: "initialHeight",
  mass: "mass",
  m: "mass",
  dragCoefficient: "dragCoefficient",
  cd: "dragCoefficient",
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

  if (result.initialSpeed === undefined) {
    throw new Error('Missing required parameter: "initialSpeed" (or alias "v0").');
  }
  if (result.launchAngleDeg === undefined) {
    throw new Error('Missing required parameter: "launchAngleDeg" (or alias "thetaDeg").');
  }
  if (result.gravity === undefined) {
    result.gravity = 9.81;
  }
  if (result.initialHeight === undefined) {
    result.initialHeight = 0;
  }
  if (result.mass === undefined) {
    result.mass = 1;
  }
  if (result.dragCoefficient === undefined) {
    result.dragCoefficient = 0;
  }

  return result as CanonicalParams;
}

export function validateStructure(params: CanonicalParams): string[] {
  const errors: string[] = [];

  const canonicalResult = ProjectileMotion.safeParse(params);
  if (!canonicalResult.success) {
    errors.push(
      ...canonicalResult.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    );
    return errors;
  }

  const assemblyResult = ProjectileAssembly.safeParse(buildProjectileAssembly(params));
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
  (p) => (p.initialSpeed > 0 ? null : `initialSpeed must be > 0, got ${p.initialSpeed}.`),
  (p) => (p.gravity > 0 ? null : `gravity must be > 0, got ${p.gravity}.`),
  (p) => (p.launchAngleDeg > 0 && p.launchAngleDeg < 90 ? null : `launchAngleDeg must be in (0, 90), got ${p.launchAngleDeg}.`),
  (p) => {
    const assembly = buildProjectileAssembly(p);
    if (assembly.state.kind !== "point_mass" || assembly.state.dof !== "2d") {
      return "projectile_motion requires a 2D point_mass state.";
    }
    if (assembly.domain.kind !== "rect_2d") {
      return `projectile_motion requires domain kind "rect_2d", got "${assembly.domain.kind}".`;
    }
    if (assembly.material.kind !== "inertial_particle") {
      return `projectile_motion requires material kind "inertial_particle", got "${assembly.material.kind}".`;
    }
    if (assembly.forcing.kind !== "constant_field" || assembly.forcing.quantity !== "gravity") {
      return "projectile_motion requires constant_field forcing with quantity=gravity.";
    }
    if (assembly.evolution.kind !== "kinematic") {
      return `projectile_motion requires evolution kind "kinematic", got "${assembly.evolution.kind}".`;
    }
    return null;
  },
  (p) => {
    const assembly = buildProjectileAssembly(p);
    const hasHeightConstraint = assembly.constraints.some(
      (constraint) => constraint.type === "specified_value" && constraint.quantity === "initialHeight",
    );
    if (!hasHeightConstraint) {
      return "projectile_motion requires a specified initialHeight constraint.";
    }
    return null;
  },
];

export type ProjectileMotion = z.infer<typeof ProjectileMotion>;

function buildProjectileAssembly(params: CanonicalParams) {
  const thetaRad = (params.launchAngleDeg * Math.PI) / 180;
  const vx = params.initialSpeed * Math.cos(thetaRad);
  const vy = params.initialSpeed * Math.sin(thetaRad);
  const flightTime = (vy + Math.sqrt(vy * vy + 2 * params.gravity * params.initialHeight)) / params.gravity;
  const range = Math.max(1, vx * flightTime);
  const maxHeight = params.initialHeight + (vy * vy) / (2 * params.gravity);

  return {
    state: {
      kind: "point_mass" as const,
      dof: "2d" as const,
      mass: params.mass,
    },
    domain: {
      kind: "rect_2d" as const,
      characteristicLength: Math.max(range, maxHeight, 1),
      dimensions: {
        width: Math.max(range * 1.1, 1),
        height: Math.max(maxHeight * 1.2, 1),
      },
      orientation: {
        axis: "x" as const,
        direction: "positive" as const,
      },
    },
    material: {
      kind: "inertial_particle" as const,
      dragCoefficient: params.dragCoefficient,
    },
    constraints: [
      {
        type: "specified_value" as const,
        target: "state.y0",
        quantity: "initialHeight",
        value: params.initialHeight,
      },
      {
        type: "free" as const,
        target: "state.trajectory",
      },
    ],
    forcing: {
      kind: "constant_field" as const,
      quantity: "gravity",
      magnitude: -params.gravity,
      direction: "y" as const,
    },
    evolution: {
      kind: "kinematic" as const,
      transient: true,
      referenceFrame: "inertial" as const,
    },
  };
}
