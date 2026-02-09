import { z } from "zod";

const PositiveFiniteNumber = z.number().finite().positive();

export const ShmEvolution = z.object({
  kind: z.literal("shm"),
}).strict();

export const DampedShmEvolution = z.object({
  kind: z.literal("damped_shm"),
  dampingRatio: z.number().finite().min(0),
}).strict();

export const KinematicEvolution = z.object({
  kind: z.literal("kinematic"),
  transient: z.literal(true),
  referenceFrame: z.enum(["inertial", "non_inertial"]),
}).strict();

export const UniformCircularEvolution = z.object({
  kind: z.literal("uniform_circular"),
  transient: z.literal(true),
  plane: z.enum(["xy", "xz", "yz"]),
}).strict();

export const OrbitalTwoBodyEvolution = z.object({
  kind: z.literal("orbital_two_body"),
  transient: z.literal(true),
  frame: z.enum(["inertial", "barycentric"]),
}).strict();

export const NavierStokesEvolution = z.object({
  kind: z.literal("navier_stokes"),
  incompressible: z.literal(true),
  newtonian: z.literal(true),
  transient: z.boolean(),
}).strict();

export const HeatDiffusionEvolution = z.object({
  kind: z.literal("heat_diffusion"),
  transient: z.boolean(),
}).strict();

export const WaveEquationEvolution = z.object({
  kind: z.literal("wave_equation"),
  waveSpeed: PositiveFiniteNumber,
  transient: z.boolean(),
}).strict();

export const Evolution = z.discriminatedUnion("kind", [
  ShmEvolution,
  DampedShmEvolution,
  KinematicEvolution,
  UniformCircularEvolution,
  OrbitalTwoBodyEvolution,
  NavierStokesEvolution,
  HeatDiffusionEvolution,
  WaveEquationEvolution,
]);

export type Evolution = z.infer<typeof Evolution>;
