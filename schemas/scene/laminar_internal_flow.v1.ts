import { z } from "zod";
import { Constraints } from "../pillars/constraints";
import { ChannelDomain, PipeDomain } from "../pillars/domain";
import { NavierStokesEvolution } from "../pillars/evolution";
import { NoForcing, PressureGradientForcing } from "../pillars/forcing";
import { NewtonianFluidMaterial } from "../pillars/material";
import { FieldVectorState } from "../pillars/state";
import type { ParameterControlSpec } from "../schemaRegistry";

export const schemaId = "laminar_internal_flow" as const;
export const schemaVersion = "v1" as const;

const PositiveFiniteNumber = z.number().finite().positive();
const FiniteNumber = z.number().finite();

export const LaminarInternalFlow = z.object({
  geometryType: z.enum(["pipe", "channel", "rectangular_duct", "annulus"]),
  length: PositiveFiniteNumber,
  hydraulicDiameter: PositiveFiniteNumber,
  pipeRadius: PositiveFiniteNumber.optional(),
  pipeDiameter: PositiveFiniteNumber.optional(),
  channelWidth: PositiveFiniteNumber.optional(),
  channelHeight: PositiveFiniteNumber.optional(),
  rectangularWidth: PositiveFiniteNumber.optional(),
  rectangularHeight: PositiveFiniteNumber.optional(),
  annulusInnerDiameter: PositiveFiniteNumber.optional(),
  annulusOuterDiameter: PositiveFiniteNumber.optional(),
  density: PositiveFiniteNumber,
  dynamicViscosity: PositiveFiniteNumber,
  reynoldsNumber: FiniteNumber,
  drivingMechanism: z.enum(["velocity-driven", "pressure-driven"]),
  meanVelocity: PositiveFiniteNumber.optional(),
  pressureGradient: FiniteNumber.optional(),
  transient: z.boolean(),
  thermalConductivity: PositiveFiniteNumber.optional(),
  specificHeat: PositiveFiniteNumber.optional(),
}).strict();

const LaminarFlowAssembly = z.object({
  state: FieldVectorState,
  domain: z.union([PipeDomain, ChannelDomain]),
  material: NewtonianFluidMaterial,
  constraints: Constraints,
  forcing: z.union([NoForcing, PressureGradientForcing]),
  evolution: NavierStokesEvolution,
}).strict();

export interface CanonicalParams {
  geometryType: "pipe" | "channel" | "rectangular_duct" | "annulus";
  length: number;
  hydraulicDiameter: number;
  pipeRadius?: number;
  pipeDiameter?: number;
  channelWidth?: number;
  channelHeight?: number;
  rectangularWidth?: number;
  rectangularHeight?: number;
  annulusInnerDiameter?: number;
  annulusOuterDiameter?: number;
  density: number;
  dynamicViscosity: number;
  reynoldsNumber: number;
  drivingMechanism: "velocity-driven" | "pressure-driven";
  meanVelocity?: number;
  pressureGradient?: number;
  transient: boolean;
  thermalConductivity?: number;
  specificHeat?: number;
  [key: string]: unknown;
}

export const parameterControlSpecs: ParameterControlSpec[] = [
  {
    key: "length",
    label: "Length",
    min: 0.1,
    max: 100,
    step: 0.1,
    unit: "m",
    controlClass: "plan_tunable",
    requiresValidation: true,
  },
  {
    key: "hydraulicDiameter",
    label: "Hydraulic Diameter",
    min: 0.001,
    max: 10,
    step: 0.001,
    unit: "m",
    controlClass: "plan_tunable",
    requiresValidation: true,
  },
  {
    key: "pipeRadius",
    label: "Pipe Radius",
    min: 0.0005,
    max: 5,
    step: 0.0005,
    unit: "m",
    controlClass: "plan_tunable",
    requiresValidation: true,
  },
  {
    key: "pipeDiameter",
    label: "Pipe Diameter",
    min: 0.001,
    max: 10,
    step: 0.001,
    unit: "m",
    controlClass: "plan_tunable",
    requiresValidation: true,
  },
  {
    key: "channelWidth",
    label: "Channel Width",
    min: 0.001,
    max: 10,
    step: 0.001,
    unit: "m",
    controlClass: "plan_tunable",
    requiresValidation: true,
  },
  {
    key: "channelHeight",
    label: "Channel Height",
    min: 0.001,
    max: 10,
    step: 0.001,
    unit: "m",
    controlClass: "plan_tunable",
    requiresValidation: true,
  },
  {
    key: "rectangularWidth",
    label: "Rectangular Width",
    min: 0.001,
    max: 10,
    step: 0.001,
    unit: "m",
    controlClass: "plan_tunable",
    requiresValidation: true,
  },
  {
    key: "rectangularHeight",
    label: "Rectangular Height",
    min: 0.001,
    max: 10,
    step: 0.001,
    unit: "m",
    controlClass: "plan_tunable",
    requiresValidation: true,
  },
  {
    key: "annulusInnerDiameter",
    label: "Annulus Inner Diameter",
    min: 0.001,
    max: 10,
    step: 0.001,
    unit: "m",
    controlClass: "plan_tunable",
    requiresValidation: true,
  },
  {
    key: "annulusOuterDiameter",
    label: "Annulus Outer Diameter",
    min: 0.001,
    max: 20,
    step: 0.001,
    unit: "m",
    controlClass: "plan_tunable",
    requiresValidation: true,
  },
  {
    key: "density",
    label: "Density",
    min: 0.1,
    max: 5000,
    step: 0.1,
    unit: "kg/m^3",
    controlClass: "plan_tunable",
    requiresValidation: true,
  },
  {
    key: "dynamicViscosity",
    label: "Dynamic Viscosity",
    min: 0.000001,
    max: 10,
    step: 0.000001,
    unit: "Pa.s",
    controlClass: "plan_tunable",
    requiresValidation: true,
  },
  {
    key: "meanVelocity",
    label: "Mean Velocity",
    min: 0.001,
    max: 100,
    step: 0.001,
    unit: "m/s",
    controlClass: "runtime_tunable",
    requiresValidation: false,
  },
  {
    key: "pressureGradient",
    label: "Pressure Gradient",
    min: -10000,
    max: 10000,
    step: 0.1,
    unit: "Pa/m",
    controlClass: "plan_tunable",
    requiresValidation: true,
  },
  {
    key: "reynoldsNumber",
    label: "Reynolds Number",
    min: 0,
    max: 2200,
    step: 1,
    controlClass: "read_only",
    requiresValidation: false,
  },
];

const PARAM_MAP: Record<string, keyof CanonicalParams> = {
  geometryType: "geometryType",
  length: "length",
  L: "length",
  hydraulicDiameter: "hydraulicDiameter",
  Dh: "hydraulicDiameter",
  pipeRadius: "pipeRadius",
  radius: "pipeRadius",
  r: "pipeRadius",
  pipeDiameter: "pipeDiameter",
  diameter: "pipeDiameter",
  D: "pipeDiameter",
  channelWidth: "channelWidth",
  channelHeight: "channelHeight",
  rectangularWidth: "rectangularWidth",
  rectangularHeight: "rectangularHeight",
  annulusInnerDiameter: "annulusInnerDiameter",
  innerDiameter: "annulusInnerDiameter",
  annulusOuterDiameter: "annulusOuterDiameter",
  outerDiameter: "annulusOuterDiameter",
  density: "density",
  rho: "density",
  dynamicViscosity: "dynamicViscosity",
  mu: "dynamicViscosity",
  reynoldsNumber: "reynoldsNumber",
  Re: "reynoldsNumber",
  drivingMechanism: "drivingMechanism",
  meanVelocity: "meanVelocity",
  U: "meanVelocity",
  pressureGradient: "pressureGradient",
  dPdx: "pressureGradient",
  transient: "transient",
  thermalConductivity: "thermalConductivity",
  specificHeat: "specificHeat",
};

function deriveHydraulicDiameter(result: Partial<CanonicalParams>) {
  if (result.geometryType === "pipe") {
    if (result.pipeRadius !== undefined) {
      result.pipeDiameter = 2 * result.pipeRadius;
      result.hydraulicDiameter = result.pipeDiameter;
      return;
    }
    if (result.pipeDiameter !== undefined) {
      result.pipeRadius = result.pipeDiameter / 2;
      result.hydraulicDiameter = result.pipeDiameter;
      return;
    }
    if (result.hydraulicDiameter !== undefined) {
      result.pipeDiameter = result.hydraulicDiameter;
      result.pipeRadius = result.hydraulicDiameter / 2;
      return;
    }
    throw new Error('Pipe geometry requires one of: "pipeRadius", "pipeDiameter", or "hydraulicDiameter".');
  }

  if (result.geometryType === "annulus") {
    const inner = result.annulusInnerDiameter;
    const outer = result.annulusOuterDiameter;
    if (inner !== undefined && outer !== undefined) {
      result.hydraulicDiameter = outer - inner;
      return;
    }
    if (result.hydraulicDiameter !== undefined) {
      return;
    }
    throw new Error('Annulus geometry requires "annulusInnerDiameter" + "annulusOuterDiameter", or explicit "hydraulicDiameter".');
  }

  if (result.geometryType === "channel") {
    const width = result.channelWidth;
    const height = result.channelHeight;
    if (width !== undefined && height !== undefined) {
      result.hydraulicDiameter = (2 * width * height) / (width + height);
      return;
    }
    if (result.hydraulicDiameter !== undefined) {
      return;
    }
    throw new Error('Channel geometry requires "channelWidth" + "channelHeight", or explicit "hydraulicDiameter".');
  }

  if (result.geometryType === "rectangular_duct") {
    const width = result.rectangularWidth;
    const height = result.rectangularHeight;
    if (width !== undefined && height !== undefined) {
      result.hydraulicDiameter = (2 * width * height) / (width + height);
      return;
    }
    throw new Error('Rectangular duct geometry requires "rectangularWidth" and "rectangularHeight".');
  }
}

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

  if (result.geometryType === undefined) {
    result.geometryType = "pipe";
  }
  if (result.length === undefined) {
    throw new Error('Missing required parameter: "length" (or alias "L").');
  }

  deriveHydraulicDiameter(result);

  if (result.density === undefined) {
    throw new Error('Missing required parameter: "density" (or alias "rho").');
  }
  if (result.dynamicViscosity === undefined) {
    throw new Error('Missing required parameter: "dynamicViscosity" (or alias "mu").');
  }
  if (result.reynoldsNumber === undefined) {
    throw new Error('Missing required parameter: "reynoldsNumber" (or alias "Re").');
  }
  if (result.drivingMechanism === undefined) {
    result.drivingMechanism = "velocity-driven";
  }
  if (result.transient === undefined) {
    result.transient = false;
  }

  return result as CanonicalParams;
}

export function validateStructure(params: CanonicalParams): string[] {
  const errors: string[] = [];

  const canonicalResult = LaminarInternalFlow.safeParse(params);
  if (!canonicalResult.success) {
    errors.push(
      ...canonicalResult.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    );
    return errors;
  }

  const assemblyResult = LaminarFlowAssembly.safeParse(buildLaminarAssembly(params));
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
  (p) => (p.reynoldsNumber >= 0 ? null : `reynoldsNumber must be >= 0, got ${p.reynoldsNumber}.`),
  (p) => (p.reynoldsNumber < 2300 ? null : `laminar_internal_flow requires Reynolds number < 2300, got ${p.reynoldsNumber}.`),
  (p) => {
    if (p.geometryType === "annulus") {
      const inner = p.annulusInnerDiameter;
      const outer = p.annulusOuterDiameter;
      if (inner === undefined || outer === undefined) {
        return 'Annulus geometry requires both "annulusInnerDiameter" and "annulusOuterDiameter".';
      }
      if (outer <= inner) {
        return `Annulus geometry requires annulusOuterDiameter > annulusInnerDiameter (got ${outer} <= ${inner}).`;
      }
    }
    return null;
  },
  (p) => {
    if (p.geometryType === "rectangular_duct") {
      if (p.rectangularWidth === undefined || p.rectangularHeight === undefined) {
        return 'Rectangular duct geometry requires both "rectangularWidth" and "rectangularHeight".';
      }
    }
    return null;
  },
  (p) => {
    if (p.geometryType === "channel") {
      const hasExplicitPair = p.channelWidth !== undefined && p.channelHeight !== undefined;
      if (!hasExplicitPair && p.hydraulicDiameter === undefined) {
        return 'Channel geometry requires "channelWidth" + "channelHeight" or explicit "hydraulicDiameter".';
      }
    }
    return null;
  },
  (p) => {
    if (p.drivingMechanism === "velocity-driven") {
      if (p.meanVelocity === undefined || p.meanVelocity <= 0) {
        return 'velocity-driven flow requires "meanVelocity" > 0.';
      }
      if (p.pressureGradient !== undefined) {
        return 'velocity-driven flow must not set "pressureGradient".';
      }
    }
    return null;
  },
  (p) => {
    if (p.drivingMechanism === "pressure-driven") {
      if (p.pressureGradient === undefined || p.pressureGradient === 0) {
        return 'pressure-driven flow requires non-zero "pressureGradient".';
      }
      if (p.meanVelocity !== undefined) {
        return 'pressure-driven flow must not set "meanVelocity".';
      }
    }
    return null;
  },
  (p) => {
    const assembly = buildLaminarAssembly(p);
    if (assembly.state.kind !== "field_vector" || assembly.state.dimension !== "3d") {
      return "laminar_internal_flow requires a 3D field_vector state.";
    }
    if (assembly.material.kind !== "newtonian_fluid") {
      return `laminar_internal_flow requires material kind "newtonian_fluid", got "${assembly.material.kind}".`;
    }
    if (assembly.evolution.kind !== "navier_stokes" || !assembly.evolution.incompressible || !assembly.evolution.newtonian) {
      return "laminar_internal_flow requires incompressible Newtonian Navier-Stokes evolution descriptor.";
    }
    if (p.drivingMechanism === "pressure-driven" && assembly.forcing.kind !== "pressure_gradient") {
      return "pressure-driven laminar flow requires pressure_gradient forcing.";
    }
    if (p.drivingMechanism === "velocity-driven" && assembly.forcing.kind !== "none") {
      return "velocity-driven laminar flow requires no external forcing descriptor.";
    }
    return null;
  },
];

export type LaminarInternalFlow = z.infer<typeof LaminarInternalFlow>;

function buildLaminarAssembly(params: CanonicalParams) {
  const pipeDiameter = params.pipeDiameter ?? params.hydraulicDiameter;
  const channelWidth = params.channelWidth ?? params.hydraulicDiameter;
  const channelHeight = params.channelHeight ?? params.hydraulicDiameter / 2;
  const rectangularWidth = params.rectangularWidth ?? channelWidth;
  const rectangularHeight = params.rectangularHeight ?? channelHeight;
  const annulusOuterDiameter = params.annulusOuterDiameter ?? params.hydraulicDiameter;
  const annulusInnerDiameter = params.annulusInnerDiameter;

  const domain =
    params.geometryType === "pipe"
      ? {
          kind: "pipe" as const,
          characteristicLength: params.hydraulicDiameter,
          dimensions: {
            length: params.length,
            diameter: pipeDiameter,
          },
          orientation: {
            axis: "x" as const,
            direction: "positive" as const,
          },
        }
      : params.geometryType === "annulus"
        ? {
            kind: "pipe" as const,
            characteristicLength: params.hydraulicDiameter,
            dimensions: {
              length: params.length,
              diameter: annulusOuterDiameter,
            },
            orientation: {
              axis: "x" as const,
              direction: "positive" as const,
            },
          }
        : {
            kind: "channel" as const,
            characteristicLength: params.hydraulicDiameter,
            dimensions: {
              length: params.length,
              width: params.geometryType === "rectangular_duct" ? rectangularWidth : channelWidth,
              height: params.geometryType === "rectangular_duct" ? rectangularHeight : channelHeight,
            },
            orientation: {
              axis: "x" as const,
              direction: "positive" as const,
            },
          };

  const inletQuantity = params.drivingMechanism === "velocity-driven" ? "meanVelocity" : "pressureGradient";
  const inletValue = params.drivingMechanism === "velocity-driven" ? params.meanVelocity ?? 0 : params.pressureGradient ?? 0;

  const constraints: Constraints = [
    {
      type: "no_slip" as const,
      target: "walls",
    },
    {
      type: "specified_value" as const,
      target: "inlet",
      quantity: inletQuantity,
      value: inletValue,
    },
    {
      type: "specified_value" as const,
      target: "outlet",
      quantity: "referencePressure",
      value: 0,
    },
  ];

  if (params.geometryType === "annulus" && annulusInnerDiameter !== undefined) {
    constraints.push({
      type: "no_slip" as const,
      target: "inner_wall",
    });
    constraints.push({
      type: "specified_value" as const,
      target: "geometry.annulus.innerDiameter",
      quantity: "innerDiameter",
      value: annulusInnerDiameter,
    });
  }

  return {
    state: {
      kind: "field_vector" as const,
      dimension: "3d" as const,
      components: 3,
    },
    domain,
    material: {
      kind: "newtonian_fluid" as const,
      density: params.density,
      dynamicViscosity: params.dynamicViscosity,
      thermalConductivity: params.thermalConductivity,
      specificHeat: params.specificHeat,
    },
    constraints,
    forcing:
      params.drivingMechanism === "pressure-driven"
        ? {
            kind: "pressure_gradient" as const,
            gradient: params.pressureGradient ?? 0,
            axis: "x" as const,
          }
        : {
            kind: "none" as const,
          },
    evolution: {
      kind: "navier_stokes" as const,
      incompressible: true as const,
      newtonian: true as const,
      transient: params.transient,
    },
  };
}
