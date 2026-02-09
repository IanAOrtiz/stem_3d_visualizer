import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { TUTOR_INSTRUCTION } from '../prompts';
import { updateSimulationTimeTool, adjustCameraTool, highlightAreaTool } from '../tools/tutor-tools';
import { withTelemetry } from '../utils/telemetry';

export const tutorAgent = withTelemetry(
  new Agent({
    id: 'tutor',
    name: 'Spaide Assistant',
    instructions: TUTOR_INSTRUCTION,
    model: 'google/gemini-3-pro-preview',
    tools: { updateSimulationTimeTool, adjustCameraTool, highlightAreaTool },
    memory: new Memory({
      options: {
        lastMessages: 20,
      },
    }),
  }),
  'tutor',
  'google/gemini-3-pro-preview',
);
