import { z } from "zod";

export const FixedConstraint = z.object({
  type: z.literal("fixed"),
  target: z.string().min(1),
}).strict();

export const FreeConstraint = z.object({
  type: z.literal("free"),
  target: z.string().min(1),
}).strict();

export const PeriodicConstraint = z.object({
  type: z.literal("periodic"),
  target: z.string().min(1),
  pairedTarget: z.string().min(1),
}).strict();

export const NoSlipConstraint = z.object({
  type: z.literal("no_slip"),
  target: z.string().min(1),
}).strict();

export const SpecifiedValueConstraint = z.object({
  type: z.literal("specified_value"),
  target: z.string().min(1),
  quantity: z.string().min(1),
  value: z.number().finite(),
}).strict();

export const Constraint = z.discriminatedUnion("type", [
  FixedConstraint,
  FreeConstraint,
  PeriodicConstraint,
  NoSlipConstraint,
  SpecifiedValueConstraint,
]);

export const Constraints = z.array(Constraint).min(1);

export type Constraint = z.infer<typeof Constraint>;
export type Constraints = z.infer<typeof Constraints>;
