import { Agent } from '@mastra/core/agent';
import { TIME_COORDINATOR_INSTRUCTION } from '../prompts';
import { withTelemetry } from '../utils/telemetry';

export const timeCoordinatorAgent = withTelemetry(
  new Agent({
    id: 'time-coordinator',
    name: 'Time Coordinator',
    instructions: TIME_COORDINATOR_INSTRUCTION,
    model: 'google/gemini-3-flash-preview',
  }),
  'time-coordinator',
  'google/gemini-3-flash-preview',
);
