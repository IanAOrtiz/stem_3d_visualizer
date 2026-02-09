import { z } from "zod";

const PositiveFiniteNumber = z.number().finite().positive();

export const IdealSpringMaterial = z.object({
  kind: z.literal("ideal_spring"),
  stiffness: PositiveFiniteNumber,
  dampingRatio: z.number().finite().min(0).optional(),
}).strict();

export const InertialParticleMaterial = z.object({
  kind: z.literal("inertial_particle"),
  dragCoefficient: z.number().finite().min(0),
}).strict();

export const NewtonianFluidMaterial = z.object({
  kind: z.literal("newtonian_fluid"),
  density: PositiveFiniteNumber,
  dynamicViscosity: PositiveFiniteNumber,
  thermalConductivity: PositiveFiniteNumber.optional(),
  specificHeat: PositiveFiniteNumber.optional(),
}).strict();

export const LinearElasticSolidMaterial = z.object({
  kind: z.literal("linear_elastic_solid"),
  density: PositiveFiniteNumber,
  youngsModulus: PositiveFiniteNumber,
  poissonsRatio: z.number().finite().gt(-1).lt(0.5),
}).strict();

export const DielectricMaterial = z.object({
  kind: z.literal("dielectric"),
  relativePermittivity: PositiveFiniteNumber,
  conductivity: z.number().finite().min(0).optional(),
}).strict();

export const Material = z.discriminatedUnion("kind", [
  IdealSpringMaterial,
  InertialParticleMaterial,
  NewtonianFluidMaterial,
  LinearElasticSolidMaterial,
  DielectricMaterial,
]);

export type Material = z.infer<typeof Material>;
