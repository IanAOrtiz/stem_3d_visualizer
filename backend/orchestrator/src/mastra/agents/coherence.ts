import { Agent } from '@mastra/core/agent';
import { COHERENCE_INSTRUCTION } from '../prompts';
import { withTelemetry } from '../utils/telemetry';

export const coherenceAgent = withTelemetry(
  new Agent({
    id: 'coherence',
    name: 'Coherence Validator',
    instructions: COHERENCE_INSTRUCTION,
    model: 'google/gemini-3-flash-preview',
  }),
  'coherence',
  'google/gemini-3-flash-preview',
);
