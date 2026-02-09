import { Agent } from '@mastra/core/agent';
import { EXPLANATION_INSTRUCTION } from '../prompts';
import { withTelemetry } from '../utils/telemetry';

export const explainerAgent = withTelemetry(
  new Agent({
    id: 'explainer',
    name: 'Scene Explainer',
    instructions: EXPLANATION_INSTRUCTION,
    model: 'google/gemini-3-flash-preview',
  }),
  'explainer',
  'google/gemini-3-flash-preview',
);
