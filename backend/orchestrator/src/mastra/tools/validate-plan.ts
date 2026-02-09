import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const EXPRESS_URL = 'http://localhost:3000';

export const validatePlanTool = createTool({
  id: 'validate-plan',
  description: 'Validate a candidate scene plan against registered v1 scene schemas via the Express backend. Returns canonical parameters or validation errors.',
  inputSchema: z.object({
    concept: z.string(),
    schemaVersion: z.string(),
    parameters: z.record(z.unknown()),
  }),
  outputSchema: z.object({
    valid: z.boolean(),
    errors: z.array(z.string()),
    canonicalScenePlan: z.object({
      concept: z.string(),
      schemaVersion: z.string(),
      parameters: z.record(z.unknown()),
      parameterControlSpecs: z.array(z.object({
        key: z.string(),
        label: z.string(),
        min: z.number(),
        max: z.number(),
        step: z.number(),
        unit: z.string().optional(),
        controlClass: z.enum(["read_only", "runtime_tunable", "plan_tunable", "locked"]),
        requiresValidation: z.boolean(),
      })).optional(),
    }).optional(),
  }),
  execute: async (inputData) => {
    const res = await fetch(`${EXPRESS_URL}/validate-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenePlan: inputData }),
    });
    return await res.json();
  },
});
