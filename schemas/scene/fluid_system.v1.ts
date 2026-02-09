import { z } from "zod";

export const schemaId = "fluid_system" as const;
export const schemaVersion = "v1" as const;

const Orientation = z.object({
  axis: z.enum(["x", "y", "z"]),
  direction: z.enum(["positive", "negative"]),
}).strict();

const PositiveFiniteNumber = z.number().finite().positive();
const FiniteNumber = z.number().finite();

const PipeGeometry = z.object({
  type: z.literal("pipe"),
  characteristicLength: PositiveFiniteNumber,
  dimensions: z.object({
    length: PositiveFiniteNumber,
    diameter: PositiveFiniteNumber,
  }).strict(),
  orientation: Orientation,
}).strict();

const ChannelGeometry = z.object({
  type: z.literal("channel"),
  characteristicLength: PositiveFiniteNumber,
  dimensions: z.object({
    length: PositiveFiniteNumber,
    width: PositiveFiniteNumber,
    height: PositiveFiniteNumber,
  }).strict(),
  orientation: Orientation,
}).strict();

const PlateGeometry = z.object({
  type: z.literal("plate"),
  characteristicLength: PositiveFiniteNumber,
  dimensions: z.object({
    length: PositiveFiniteNumber,
    width: PositiveFiniteNumber,
  }).strict(),
  orientation: Orientation,
}).strict();

const CavityGeometry = z.object({
  type: z.literal("cavity"),
  characteristicLength: PositiveFiniteNumber,
  dimensions: z.object({
    length: PositiveFiniteNumber,
    width: PositiveFiniteNumber,
    height: PositiveFiniteNumber,
  }).strict(),
  orientation: Orientation,
}).strict();

const Geometry = z.discriminatedUnion("type", [
  PipeGeometry,
  ChannelGeometry,
  PlateGeometry,
  CavityGeometry,
]);

const FluidProperties = z.object({
  density: PositiveFiniteNumber,
  dynamicViscosity: PositiveFiniteNumber,
  thermalConductivity: PositiveFiniteNumber.optional(),
  specificHeat: PositiveFiniteNumber.optional(),
}).strict();

const BoundaryConditionType = z.enum([
  "no-slip",
  "slip",
  "specified-velocity",
  "specified-pressure",
  "symmetry",
]);

const BoundaryConditions = z.object({
  inlet: BoundaryConditionType,
  outlet: BoundaryConditionType,
  walls: BoundaryConditionType,
}).strict();

const FlowConfiguration = z.object({
  drivingMechanism: z.enum(["pressure-driven", "velocity-driven"]),
  inletVelocity: FiniteNumber.optional(),
  pressureGradient: FiniteNumber.optional(),
  boundaryConditions: BoundaryConditions,
  transient: z.boolean(),
}).strict();

const FlowRegime = z.object({
  reynoldsNumber: FiniteNumber,
  regimeType: z.enum(["laminar", "transitional", "turbulent"]),
  turbulenceModel: z.string().optional(),
}).strict();

export const FluidSystem = z.object({
  geometry: Geometry,
  fluidProperties: FluidProperties,
  flowConfiguration: FlowConfiguration,
  flowRegime: FlowRegime,
}).strict();

export interface CanonicalParams {
  geometry: z.infer<typeof Geometry>;
  fluidProperties: z.infer<typeof FluidProperties>;
  flowConfiguration: z.infer<typeof FlowConfiguration>;
  flowRegime: z.infer<typeof FlowRegime>;
  [key: string]: unknown;
}

const PARAM_MAP: Record<string, keyof CanonicalParams> = {
  geometry: "geometry",
  fluidProperties: "fluidProperties",
  flowConfiguration: "flowConfiguration",
  flowRegime: "flowRegime",
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

  if (result.geometry === undefined) {
    throw new Error('Missing required parameter: "geometry".');
  }
  if (result.fluidProperties === undefined) {
    throw new Error('Missing required parameter: "fluidProperties".');
  }
  if (result.flowConfiguration === undefined) {
    throw new Error('Missing required parameter: "flowConfiguration".');
  }
  if (result.flowRegime === undefined) {
    throw new Error('Missing required parameter: "flowRegime".');
  }

  return result as CanonicalParams;
}

export function validateStructure(params: CanonicalParams): string[] {
  const errors: string[] = [];

  const geometryResult = Geometry.safeParse(params.geometry);
  if (!geometryResult.success) {
    errors.push(`geometry invalid: ${geometryResult.error.issues[0]?.message ?? "invalid geometry"}`);
  }

  const fluidPropertiesResult = FluidProperties.safeParse(params.fluidProperties);
  if (!fluidPropertiesResult.success) {
    errors.push(`fluidProperties invalid: ${fluidPropertiesResult.error.issues[0]?.message ?? "invalid fluidProperties"}`);
  }

  const flowConfigurationResult = FlowConfiguration.safeParse(params.flowConfiguration);
  if (!flowConfigurationResult.success) {
    errors.push(`flowConfiguration invalid: ${flowConfigurationResult.error.issues[0]?.message ?? "invalid flowConfiguration"}`);
  }

  const flowRegimeResult = FlowRegime.safeParse(params.flowRegime);
  if (!flowRegimeResult.success) {
    errors.push(`flowRegime invalid: ${flowRegimeResult.error.issues[0]?.message ?? "invalid flowRegime"}`);
  }

  return errors;
}

const TURBULENCE_MODELS = new Set(["k-epsilon", "k-omega", "spalart-allmaras"]);

export const contracts: Array<(params: CanonicalParams) => string | null> = [
  (p) => (
    p.flowRegime.reynoldsNumber >= 0
      ? null
      : `reynoldsNumber must be >= 0, got ${p.flowRegime.reynoldsNumber}.`
  ),
  (p) => {
    const model = p.flowRegime.turbulenceModel;
    if (model === undefined) return null;
    if (p.flowRegime.regimeType !== "turbulent") {
      return `turbulenceModel is only allowed when regimeType is "turbulent", got "${p.flowRegime.regimeType}".`;
    }
    if (!TURBULENCE_MODELS.has(model)) {
      return `Unknown turbulenceModel "${model}". Allowed: ${Array.from(TURBULENCE_MODELS).join(", ")}.`;
    }
    return null;
  },
  (p) => {
    if (p.flowRegime.regimeType === "laminar" && p.flowRegime.turbulenceModel !== undefined) {
      return 'Laminar regime must not include turbulenceModel.';
    }
    return null;
  },
  (p) => {
    const hasInletVelocity = p.flowConfiguration.inletVelocity !== undefined;
    const hasPressureGradient = p.flowConfiguration.pressureGradient !== undefined;
    if (hasInletVelocity === hasPressureGradient) {
      return 'Provide exactly one of "inletVelocity" or "pressureGradient".';
    }
    return null;
  },
  (p) => {
    if (p.flowConfiguration.drivingMechanism === "velocity-driven" && p.flowConfiguration.inletVelocity === undefined) {
      return 'velocity-driven flow requires "inletVelocity".';
    }
    return null;
  },
  (p) => {
    if (p.flowConfiguration.drivingMechanism === "pressure-driven" && p.flowConfiguration.pressureGradient === undefined) {
      return 'pressure-driven flow requires "pressureGradient".';
    }
    return null;
  },
];

export type FluidSystem = z.infer<typeof FluidSystem>;
export type GeometryType = z.infer<typeof Geometry>;
export type FluidPropertiesType = z.infer<typeof FluidProperties>;
export type FlowConfigurationType = z.infer<typeof FlowConfiguration>;
export type FlowRegimeType = z.infer<typeof FlowRegime>;
