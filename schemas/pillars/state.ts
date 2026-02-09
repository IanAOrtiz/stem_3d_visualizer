import { z } from "zod";

const PositiveFiniteNumber = z.number().finite().positive();
const PositiveInteger = z.number().int().positive();

export const PointMassState = z.object({
  kind: z.literal("point_mass"),
  dof: z.enum(["1d", "2d", "3d"]),
  mass: PositiveFiniteNumber,
}).strict();

export const FieldScalarState = z.object({
  kind: z.literal("field_scalar"),
  dimension: z.enum(["1d", "2d", "3d"]),
  quantity: z.string().min(1),
}).strict();

export const FieldVectorState = z.object({
  kind: z.literal("field_vector"),
  dimension: z.enum(["1d", "2d", "3d"]),
  components: z.number().int().min(1).max(3),
}).strict();

export const RigidBodyState = z.object({
  kind: z.literal("rigid_body"),
  dimension: z.enum(["2d", "3d"]),
  mass: PositiveFiniteNumber,
}).strict();

export const ParticleEnsembleState = z.object({
  kind: z.literal("particle_ensemble"),
  count: PositiveInteger,
  particleMass: PositiveFiniteNumber.optional(),
}).strict();

export const State = z.discriminatedUnion("kind", [
  PointMassState,
  FieldScalarState,
  FieldVectorState,
  RigidBodyState,
  ParticleEnsembleState,
]);

export type State = z.infer<typeof State>;
