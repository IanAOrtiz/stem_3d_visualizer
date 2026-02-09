import { Agent } from '@mastra/core/agent';
import { CAMERAMAN_INSTRUCTION } from '../prompts';
import { withTelemetry } from '../utils/telemetry';

export const cameramanAgent = withTelemetry(
  new Agent({
    id: 'cameraman',
    name: 'Cameraman',
    instructions: CAMERAMAN_INSTRUCTION,
    model: 'google/gemini-3-flash-preview',
  }),
  'cameraman',
  'google/gemini-3-flash-preview',
);
