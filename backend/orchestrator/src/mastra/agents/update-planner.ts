import { Agent } from '@mastra/core/agent';
import { UPDATE_PLANNER_INSTRUCTION } from '../prompts';
import { validatePlanTool } from '../tools/validate-plan';

export const updatePlannerAgent = new Agent({
  id: 'update-planner',
  name: 'Update Planner',
  instructions: UPDATE_PLANNER_INSTRUCTION,
  model: 'google/gemini-3-flash-preview',
  tools: { validatePlanTool },
});
