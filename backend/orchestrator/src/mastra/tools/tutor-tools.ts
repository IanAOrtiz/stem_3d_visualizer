import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// These tools are "pass-through" — the tutor agent calls them to signal
// UI actions. The frontend reads the tool call results from the response
// and executes the corresponding UI updates (timeline scrub, camera move, highlight).

export const updateSimulationTimeTool = createTool({
  id: 'update-simulation-time',
  description: 'Adjust the simulation timeline (t) to a specific frame of interest (0.0 to 1.0).',
  inputSchema: z.object({
    t: z.number().min(0).max(1).describe('The target time value from 0.0 (start) to 1.0 (end).'),
  }),
  outputSchema: z.object({
    t: z.number(),
    applied: z.boolean(),
  }),
  execute: async ({ t }) => {
    return { t, applied: true };
  },
});

export const adjustCameraTool = createTool({
  id: 'adjust-camera',
  description: 'Request the CameraMan to reframe the view to focus on a specific component.',
  inputSchema: z.object({
    intent: z.string().describe('A description of what needs to be visible (e.g., "Zoom into the top of the pendulum").'),
  }),
  outputSchema: z.object({
    intent: z.string(),
    applied: z.boolean(),
  }),
  execute: async ({ intent }) => {
    return { intent, applied: true };
  },
});

export const highlightAreaTool = createTool({
  id: 'highlight-area',
  description: "Point a visual indicator (arrow) at a specific component to draw the user's attention without moving the camera.",
  inputSchema: z.object({
    intent: z.string().describe('A description of what to point at (e.g., "The pivot point of the pendulum").'),
  }),
  outputSchema: z.object({
    intent: z.string(),
    applied: z.boolean(),
  }),
  execute: async ({ intent }) => {
    return { intent, applied: true };
  },
});
