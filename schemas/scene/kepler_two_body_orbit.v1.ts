import { z } from "zod";
import { Constraints } from "../pillars/constraints";
import { Box3DDomain } from "../pillars/domain";
import { OrbitalTwoBodyEvolution } from "../pillars/evolution";
import { CentralInverseSquareForcing } from "../pillars/forcing";
import { InertialParticleMaterial } from "../pillars/material";
import { ParticleEnsembleState } from "../pillars/state";
import type { ParameterControlSpec } from "../schemaRegistry";

export const schemaId = "kepler_two_body_orbit" as const;
export const schemaVersion = "v1" as const;

const PositiveFiniteNumber = z.number().finite().positive();
const FiniteNumber = z.number().finite();

export const KeplerTwoBodyOrbit = z.object({
  semiMajorAxis: PositiveFiniteNumber,
  eccentricity: z.number().finite().min(0).lt(1),
  gravitationalParameter: PositiveFiniteNumber,
  phase: FiniteNumber,
  inclinationDeg: z.number().finite().min(0).max(180),
}).strict();

const KeplerAssembly = z.object({
  state: ParticleEnsembleState,
  domain: Box3DDomain,
  material: InertialParticleMaterial,
  constraints: Constraints,
  forcing: CentralInverseSquareForcing,
  evolution: OrbitalTwoBodyEvolution,
}).strict();

export interface CanonicalParams {
  semiMajorAxis: number;
  eccentricity: number;
  gravitationalParameter: number;
  phase: number;
  inclinationDeg: number;
  [key: string]: unknown;
}

export const parameterControlSpecs: ParameterControlSpec[] = [
  {
    key: "semiMajorAxis",
    label: "Semi-Major Axis",
    min: 0.1,
    max: 500,
    step: 0.1,
    unit: "m",
    controlClass: "runtime_tunable",
    requiresValidation: false,
  },
  {
    key: "eccentricity",
    label: "Eccentricity",
    min: 0,
    max: 0.95,
    step: 0.001,
    controlClass: "runtime_tunable",
    requiresValidation: false,
  },
  {
    key: "gravitationalParameter",
    label: "Mu",
    min: 0.01,
    max: 10000,
    step: 0.01,
    controlClass: "plan_tunable",
    requiresValidation: true,
  },
  {
    key: "phase",
    label: "True Anomaly Offset",
    min: -6.2832,
    max: 6.2832,
    step: 0.01,
    unit: "rad",
    controlClass: "runtime_tunable",
    requiresValidation: false,
  },
  {
    key: "inclinationDeg",
    label: "Inclination",
    min: 0,
    max: 180,
    step: 0.1,
    unit: "deg",
    controlClass: "runtime_tunable",
    requiresValidation: false,
  },
];

const PARAM_MAP: Record<string, keyof CanonicalParams> = {
  semiMajorAxis: "semiMajorAxis",
  a: "semiMajorAxis",
  eccentricity: "eccentricity",
  e: "eccentricity",
  gravitationalParameter: "gravitationalParameter",
  mu: "gravitationalParameter",
  phase: "phase",
  inclinationDeg: "inclinationDeg",
  inclination: "inclinationDeg",
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

  if (result.semiMajorAxis === undefined) {
    throw new Error('Missing required parameter: "semiMajorAxis" (or alias "a").');
  }
  if (result.eccentricity === undefined) {
    throw new Error('Missing required parameter: "eccentricity" (or alias "e").');
  }
  if (result.gravitationalParameter === undefined) {
    throw new Error('Missing required parameter: "gravitationalParameter" (or alias "mu").');
  }
  if (result.phase === undefined) {
    result.phase = 0;
  }
  if (result.inclinationDeg === undefined) {
    result.inclinationDeg = 0;
  }

  return result as CanonicalParams;
}

export function validateStructure(params: CanonicalParams): string[] {
  const errors: string[] = [];

  const canonicalResult = KeplerTwoBodyOrbit.safeParse(params);
  if (!canonicalResult.success) {
    errors.push(
      ...canonicalResult.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    );
    return errors;
  }

  const assemblyResult = KeplerAssembly.safeParse(buildKeplerAssembly(params));
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
  (p) => (p.semiMajorAxis > 0 ? null : `semiMajorAxis must be > 0, got ${p.semiMajorAxis}.`),
  (p) => (p.eccentricity >= 0 && p.eccentricity < 1 ? null : `eccentricity must satisfy 0 <= e < 1, got ${p.eccentricity}.`),
  (p) => (p.gravitationalParameter > 0 ? null : `gravitationalParameter must be > 0, got ${p.gravitationalParameter}.`),
  (p) => {
    const assembly = buildKeplerAssembly(p);
    if (assembly.state.kind !== "particle_ensemble" || assembly.state.count !== 2) {
      return "kepler_two_body_orbit requires particle_ensemble state with count=2.";
    }
    if (assembly.domain.kind !== "box_3d") {
      return `kepler_two_body_orbit requires domain kind "box_3d", got "${assembly.domain.kind}".`;
    }
    if (assembly.material.kind !== "inertial_particle") {
      return `kepler_two_body_orbit requires material kind "inertial_particle", got "${assembly.material.kind}".`;
    }
    if (assembly.forcing.kind !== "central_inverse_square") {
      return `kepler_two_body_orbit requires forcing kind "central_inverse_square", got "${assembly.forcing.kind}".`;
    }
    if (assembly.evolution.kind !== "orbital_two_body") {
      return `kepler_two_body_orbit requires evolution kind "orbital_two_body", got "${assembly.evolution.kind}".`;
    }
    return null;
  },
  (p) => {
    const assembly = buildKeplerAssembly(p);
    const hasFixedPrimary = assembly.constraints.some(
      (constraint) => constraint.type === "fixed" && constraint.target === "primary",
    );
    if (!hasFixedPrimary) {
      return "kepler_two_body_orbit requires a fixed primary-body constraint.";
    }
    return null;
  },
];

export type KeplerTwoBodyOrbit = z.infer<typeof KeplerTwoBodyOrbit>;

function buildKeplerAssembly(params: CanonicalParams) {
  const apoapsis = params.semiMajorAxis * (1 + params.eccentricity);
  const size = Math.max(apoapsis * 4, 1);

  return {
    state: {
      kind: "particle_ensemble" as const,
      count: 2,
      particleMass: 1,
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
        type: "fixed" as const,
        target: "primary",
      },
      {
        type: "free" as const,
        target: "secondary",
      },
    ],
    forcing: {
      kind: "central_inverse_square" as const,
      mu: params.gravitationalParameter,
      center: { x: 0, y: 0, z: 0 },
    },
    evolution: {
      kind: "orbital_two_body" as const,
      transient: true,
      frame: "inertial" as const,
    },
  };
}
