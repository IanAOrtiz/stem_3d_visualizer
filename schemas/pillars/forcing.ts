import { z } from "zod";

const FiniteNumber = z.number().finite();
const PositiveFiniteNumber = z.number().finite().positive();

export const NoForcing = z.object({
  kind: z.literal("none"),
}).strict();

export const ConstantFieldForcing = z.object({
  kind: z.literal("constant_field"),
  quantity: z.string().min(1),
  magnitude: FiniteNumber,
  direction: z.enum(["x", "y", "z"]).optional(),
}).strict();

export const HarmonicDriveForcing = z.object({
  kind: z.literal("harmonic_drive"),
  amplitude: PositiveFiniteNumber,
  frequency: PositiveFiniteNumber,
  phase: FiniteNumber,
}).strict();

export const PressureGradientForcing = z.object({
  kind: z.literal("pressure_gradient"),
  gradient: FiniteNumber,
  axis: z.enum(["x", "y", "z"]),
}).strict();

export const PointSourceForcing = z.object({
  kind: z.literal("point_source"),
  strength: FiniteNumber,
  location: z.object({
    x: FiniteNumber,
    y: FiniteNumber,
    z: FiniteNumber.optional(),
  }).strict(),
}).strict();

export const CentralInverseSquareForcing = z.object({
  kind: z.literal("central_inverse_square"),
  mu: PositiveFiniteNumber,
  center: z.object({
    x: FiniteNumber,
    y: FiniteNumber,
    z: FiniteNumber,
  }).strict(),
}).strict();

export const Forcing = z.discriminatedUnion("kind", [
  NoForcing,
  ConstantFieldForcing,
  HarmonicDriveForcing,
  PressureGradientForcing,
  PointSourceForcing,
  CentralInverseSquareForcing,
]);

export type Forcing = z.infer<typeof Forcing>;
