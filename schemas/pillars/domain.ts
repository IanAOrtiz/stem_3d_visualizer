import { z } from "zod";

const PositiveFiniteNumber = z.number().finite().positive();

const Orientation = z.object({
  axis: z.enum(["x", "y", "z"]),
  direction: z.enum(["positive", "negative"]),
}).strict();

export const Interval1DDomain = z.object({
  kind: z.literal("interval_1d"),
  characteristicLength: PositiveFiniteNumber,
  dimensions: z.object({
    length: PositiveFiniteNumber,
  }).strict(),
  orientation: Orientation,
}).strict();

export const Rect2DDomain = z.object({
  kind: z.literal("rect_2d"),
  characteristicLength: PositiveFiniteNumber,
  dimensions: z.object({
    width: PositiveFiniteNumber,
    height: PositiveFiniteNumber,
  }).strict(),
  orientation: Orientation,
}).strict();

export const Box3DDomain = z.object({
  kind: z.literal("box_3d"),
  characteristicLength: PositiveFiniteNumber,
  dimensions: z.object({
    width: PositiveFiniteNumber,
    height: PositiveFiniteNumber,
    depth: PositiveFiniteNumber,
  }).strict(),
  orientation: Orientation,
}).strict();

export const PipeDomain = z.object({
  kind: z.literal("pipe"),
  characteristicLength: PositiveFiniteNumber,
  dimensions: z.object({
    length: PositiveFiniteNumber,
    diameter: PositiveFiniteNumber,
  }).strict(),
  orientation: Orientation,
}).strict();

export const ChannelDomain = z.object({
  kind: z.literal("channel"),
  characteristicLength: PositiveFiniteNumber,
  dimensions: z.object({
    length: PositiveFiniteNumber,
    width: PositiveFiniteNumber,
    height: PositiveFiniteNumber,
  }).strict(),
  orientation: Orientation,
}).strict();

export const PlateDomain = z.object({
  kind: z.literal("plate"),
  characteristicLength: PositiveFiniteNumber,
  dimensions: z.object({
    length: PositiveFiniteNumber,
    width: PositiveFiniteNumber,
  }).strict(),
  orientation: Orientation,
}).strict();

export const CavityDomain = z.object({
  kind: z.literal("cavity"),
  characteristicLength: PositiveFiniteNumber,
  dimensions: z.object({
    length: PositiveFiniteNumber,
    width: PositiveFiniteNumber,
    height: PositiveFiniteNumber,
  }).strict(),
  orientation: Orientation,
}).strict();

export const Domain = z.discriminatedUnion("kind", [
  Interval1DDomain,
  Rect2DDomain,
  Box3DDomain,
  PipeDomain,
  ChannelDomain,
  PlateDomain,
  CavityDomain,
]);

export type Domain = z.infer<typeof Domain>;
