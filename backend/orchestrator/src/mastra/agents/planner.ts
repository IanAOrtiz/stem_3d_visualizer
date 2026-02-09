import { Agent } from '@mastra/core/agent';
import { PLANNER_INSTRUCTION } from '../prompts';
import { validatePlanTool } from '../tools/validate-plan';
import { withTelemetry } from '../utils/telemetry';

export const plannerAgent = withTelemetry(
  new Agent({
    id: 'planner',
    name: 'Scene Planner',
    instructions: PLANNER_INSTRUCTION,
    model: 'google/gemini-3-flash-preview',
    tools: { validatePlanTool },
  }),
  'planner',
  'google/gemini-3-flash-preview',
);
