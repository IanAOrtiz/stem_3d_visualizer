import { Agent } from '@mastra/core/agent';
import { OVERSEER_INSTRUCTION } from '../prompts';
import { withTelemetry } from '../utils/telemetry';

export const overseerAgent = withTelemetry(
  new Agent({
    id: 'overseer',
    name: 'Spaide Overseer',
    instructions: OVERSEER_INSTRUCTION,
    model: 'google/gemini-3-flash-preview',
  }),
  'overseer',
  'google/gemini-3-flash-preview',
);
