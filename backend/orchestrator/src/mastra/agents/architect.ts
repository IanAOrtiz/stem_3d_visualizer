import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { ARCHITECT_INSTRUCTION } from '../prompts';
import { withTelemetry } from '../utils/telemetry';

export const architectAgent = withTelemetry(
  new Agent({
    id: 'architect',
    name: 'Lead Architect',
    instructions: ARCHITECT_INSTRUCTION,
    model: 'google/gemini-3-pro-preview',
    memory: new Memory({
      options: {
        lastMessages: 20,
      },
    }),
  }),
  'architect',
  'google/gemini-3-pro-preview',
);
