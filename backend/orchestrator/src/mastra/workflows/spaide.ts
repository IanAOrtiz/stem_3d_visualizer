import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { overseerAgent } from '../agents/overseer';
import { cameramanAgent } from '../agents/cameraman';
import { timeCoordinatorAgent } from '../agents/time-coordinator';
import { tutorAgent } from '../agents/tutor';

const vectorSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

const cameraDecisionSchema = z.object({
  active: z.boolean(),
  intent: z.string().optional(),
  reason: z.string().optional(),
});

const timeDecisionSchema = z.object({
  active: z.boolean(),
  intent: z.string().optional(),
  reason: z.string().optional(),
});

const overseerSchema = z.object({
  camera: cameraDecisionSchema,
  time: timeDecisionSchema,
  suggestEdit: z.object({
    active: z.boolean(),
    reason: z.string().optional(),
  }),
});

const cameraResultSchema = cameraDecisionSchema.extend({
  position: vectorSchema.optional(),
  target: vectorSchema.optional(),
});

const timeResultSchema = timeDecisionSchema.extend({
  t: z.number().optional(),
});

const spaideOutputSchema = z.object({
  response: z.string(),
  camera: cameraResultSchema,
  time: timeResultSchema,
  suggestEdit: z.object({
    active: z.boolean(),
    reason: z.string().optional(),
  }),
});

const extractJson = (text: string) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
};

const overseerStep = createStep({
  id: 'overseer',
  inputSchema: z.object({
    intent: z.string(),
    currentCode: z.string().optional(),
  }),
  outputSchema: z.object({
    overseer: overseerSchema,
  }),
  execute: async ({ inputData }) => {
    const promptParts = [
      `User message: "${inputData.intent}"`,
    ];
    if (inputData.currentCode) {
      promptParts.push(`Current visualization code:\n${inputData.currentCode}`);
    }

    const result = await overseerAgent.generate(promptParts.join('\n\n'));
    const parsed = extractJson(result.text);
    const validated = overseerSchema.safeParse(parsed);

    if (!validated.success) {
      return {
        overseer: {
          camera: { active: false, reason: 'Overseer returned invalid JSON' },
          time: { active: false, reason: 'Overseer returned invalid JSON' },
          suggestEdit: { active: false, reason: 'Overseer returned invalid JSON' },
        },
      };
    }

    return { overseer: validated.data };
  },
});

const cameraStep = createStep({
  id: 'camera',
  inputSchema: z.object({
    intent: z.string(),
    currentCode: z.string().optional(),
    overseer: overseerSchema,
  }),
  outputSchema: z.object({
    camera: cameraResultSchema,
  }),
  execute: async ({ inputData }) => {
    const decision = inputData.overseer.camera;
    if (!decision.active) {
      return { camera: { active: false, intent: decision.intent, reason: decision.reason } };
    }

    if (!inputData.currentCode) {
      return {
        camera: {
          active: true,
          intent: decision.intent,
          reason: 'No current visualization code provided',
        },
      };
    }

    const prompt = [
      `User message: "${inputData.intent}"`,
      `Camera focus intent: "${decision.intent || 'Focus on the most relevant component'}"`,
      `Visualization code:\n${inputData.currentCode}`,
    ].join('\n\n');

    const result = await cameramanAgent.generate(prompt);
    const parsed = extractJson(result.text);
    const validated = z.object({
      position: vectorSchema,
      target: vectorSchema,
    }).safeParse(parsed);

    if (!validated.success) {
      return {
        camera: {
          active: true,
          intent: decision.intent,
          reason: 'Failed to parse cameraman output',
        },
      };
    }

    return {
      camera: {
        active: true,
        intent: decision.intent,
        position: validated.data.position,
        target: validated.data.target,
      },
    };
  },
});

const timeStep = createStep({
  id: 'time',
  inputSchema: z.object({
    intent: z.string(),
    currentCode: z.string().optional(),
    overseer: overseerSchema,
  }),
  outputSchema: z.object({
    time: timeResultSchema,
  }),
  execute: async ({ inputData }) => {
    const decision = inputData.overseer.time;
    if (!decision.active) {
      return { time: { active: false, intent: decision.intent, reason: decision.reason } };
    }

    const promptParts = [
      `User message: "${inputData.intent}"`,
      `Time focus intent: "${decision.intent || 'Choose the most clarifying moment'}"`,
    ];
    if (inputData.currentCode) {
      promptParts.push(`Visualization code:\n${inputData.currentCode}`);
    }

    const result = await timeCoordinatorAgent.generate(promptParts.join('\n\n'));
    const parsed = extractJson(result.text);
    const validated = z.object({
      active: z.boolean(),
      t: z.number().optional(),
      reason: z.string().optional(),
    }).safeParse(parsed);

    if (!validated.success) {
      return {
        time: {
          active: true,
          intent: decision.intent,
          reason: 'Failed to parse time coordinator output',
        },
      };
    }

    if (!validated.data.active || validated.data.t === undefined) {
      return {
        time: {
          active: false,
          intent: decision.intent,
          reason: validated.data.reason || 'Time coordinator did not choose a time',
        },
      };
    }

    const t = validated.data.t;
    if (t < 0 || t > 1) {
      return {
        time: {
          active: true,
          intent: decision.intent,
          reason: `Time coordinator returned out-of-range t=${t}`,
        },
      };
    }

    return {
      time: {
        active: true,
        intent: decision.intent,
        t,
        reason: validated.data.reason,
      },
    };
  },
});

const tutorStep = createStep({
  id: 'tutor',
  inputSchema: z.object({
    intent: z.string(),
    currentCode: z.string().optional(),
    history: z.array(z.object({
      role: z.string(),
      text: z.string(),
    })).optional(),
    camera: cameraResultSchema,
    time: timeResultSchema,
    suggestEdit: z.object({
      active: z.boolean(),
      reason: z.string().optional(),
    }),
  }),
  outputSchema: spaideOutputSchema,
  execute: async ({ inputData }) => {
    const { intent, currentCode, history, camera, time, suggestEdit } = inputData;

    const guidance = [
      'OVERSEER CONTEXT',
      `camera.active: ${camera.active}`,
      `camera.intent: ${camera.intent || ''}`,
      `camera.position: ${camera.position ? JSON.stringify(camera.position) : ''}`,
      `camera.target: ${camera.target ? JSON.stringify(camera.target) : ''}`,
      `time.active: ${time.active}`,
      `time.intent: ${time.intent || ''}`,
      `time.t: ${typeof time.t === 'number' ? time.t : ''}`,
      `suggestEdit.active: ${suggestEdit.active}`,
      `suggestEdit.reason: ${suggestEdit.reason || ''}`,
      '',
      'Rules:',
      '- If camera.active is true, speak as if you adjusted the camera to the intent.',
      '- If time.active is true and time.t is provided, speak as if you moved the timeline to that t.',
      '- If suggestEdit.active is false, do NOT include [SUGGESTED_EDIT].',
      '- If suggestEdit.active is true and an edit would clarify the question, include [SUGGESTED_EDIT].',
      '- If camera.active is true, call the adjust-camera tool with the camera intent.',
      '- If time.active is true and time.t is provided, call update-simulation-time with the t value.',
    ].join('\n');

    const promptParts = [
      guidance,
      `User message: "${intent}"`,
    ];

    if (currentCode) {
      promptParts.push(`Current visualization code:\n${currentCode}`);
    }

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    if (history) {
      for (const msg of history) {
        messages.push({
          role: msg.role === 'model' ? 'assistant' : 'user',
          content: msg.text,
        });
      }
    }

    messages.push({ role: 'user', content: promptParts.join('\n\n') });

    const result = await tutorAgent.generate(messages);

    return {
      response: result.text,
      camera,
      time,
      suggestEdit,
    };
  },
});

export const spaideWorkflow = createWorkflow({
  id: 'spaide',
  inputSchema: z.object({
    intent: z.string(),
    currentCode: z.string().optional(),
    history: z.array(z.object({
      role: z.string(),
      text: z.string(),
    })).optional(),
  }),
  outputSchema: spaideOutputSchema,
})
  .then(overseerStep)
  .map(async ({ inputData, getInitData }) => {
    const init = getInitData<{ intent: string; currentCode?: string }>();
    return {
      intent: init.intent,
      currentCode: init.currentCode,
      overseer: inputData.overseer,
    };
  })
  .then(cameraStep)
  .map(async ({ inputData, getInitData, getStepResult }) => {
    const init = getInitData<{ intent: string; currentCode?: string }>();
    const overseer = getStepResult(overseerStep).overseer;
    return {
      intent: init.intent,
      currentCode: init.currentCode,
      overseer,
    };
  })
  .then(timeStep)
  .map(async ({ inputData, getInitData, getStepResult }) => {
    const init = getInitData<{ intent: string; currentCode?: string; history?: Array<{ role: string; text: string }> }>();
    const overseer = getStepResult(overseerStep).overseer;
    const camera = getStepResult(cameraStep).camera;
    return {
      intent: init.intent,
      currentCode: init.currentCode,
      history: init.history,
      camera,
      time: inputData.time,
      suggestEdit: overseer.suggestEdit,
    };
  })
  .then(tutorStep)
  .commit();
