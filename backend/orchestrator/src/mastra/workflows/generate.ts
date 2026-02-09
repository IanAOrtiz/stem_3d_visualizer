import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { plannerAgent } from '../agents/planner';
import { explainerAgent } from '../agents/explainer';
import { coherenceAgent } from '../agents/coherence';
import { architectAgent } from '../agents/architect';
import { validatePlanTool } from '../tools/validate-plan';

const parameterControlSpecSchema = z.object({
  key: z.string(),
  label: z.string(),
  min: z.number(),
  max: z.number(),
  step: z.number(),
  unit: z.string().optional(),
  controlClass: z.enum(["read_only", "runtime_tunable", "plan_tunable", "locked"]),
  requiresValidation: z.boolean(),
});

const scenePlanSchema = z.object({
  concept: z.string(),
  schemaVersion: z.string(),
  parameters: z.record(z.unknown()),
  parameterControlSpecs: z.array(parameterControlSpecSchema).optional(),
});

const MAX_PLAN_ATTEMPTS = 3;

const timedModelCall = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
  const start = Date.now();
  try {
    const result = await fn();
    console.info(`[model-timing] ${label} completed in ${Date.now() - start}ms`);
    return result;
  } catch (error) {
    console.warn(`[model-timing] ${label} failed after ${Date.now() - start}ms`);
    throw error;
  }
};

// ─── Step 1: Plan ──────────────────────────────────────────────────────────────
// Calls planner agent, parses JSON, validates via Express, retries up to 3x.

const planStep = createStep({
  id: 'plan',
  inputSchema: z.object({
    intent: z.string(),
  }),
  outputSchema: z.object({
    scenePlan: scenePlanSchema,
  }),
  execute: async ({ inputData }) => {
    let lastErrors: string[] = [];
    let lastCandidate: unknown = null;
    let lastRawOutput = '';

    for (let attempt = 0; attempt < MAX_PLAN_ATTEMPTS; attempt++) {
      const attemptNumber = attempt + 1;
      const promptParts = [
        `User intent: "${inputData.intent}"`,
      ];

      if (attempt > 0) {
        const diagnostics = lastErrors.length > 0 ? lastErrors.join('\n') : 'Unknown validation failure';
        promptParts.push(
          'Previous candidate scene plan (invalid):',
          JSON.stringify(lastCandidate ?? lastRawOutput, null, 2),
          'Validation diagnostics:',
          diagnostics,
          'Return a fully corrected scene plan JSON object with fields: concept, schemaVersion, parameters.',
        );
      }

      const prompt = promptParts.join('\n\n');

      const result = await timedModelCall(
        `generate.plan planner attempt ${attemptNumber}/${MAX_PLAN_ATTEMPTS}`,
        () => plannerAgent.generate(prompt),
      );
      lastRawOutput = result.text;

      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        lastErrors = ['Response did not contain valid JSON'];
        lastCandidate = result.text;
        continue;
      }

      let plan;
      try {
        plan = JSON.parse(jsonMatch[0]);
      } catch {
        lastErrors = ['Failed to parse JSON from response'];
        lastCandidate = jsonMatch[0];
        continue;
      }

      lastCandidate = plan;

      const validation = await validatePlanTool.execute(plan, {});

      if (validation.valid && validation.canonicalScenePlan) {
        return { scenePlan: validation.canonicalScenePlan };
      }

      lastErrors = validation.errors && validation.errors.length > 0
        ? validation.errors
        : ['Validation failed with no diagnostics returned'];
    }

    throw new Error(`Plan validation failed after ${MAX_PLAN_ATTEMPTS} attempts: ${lastErrors.join(', ')}`);
  },
});

// ─── Step 2: Explain ───────────────────────────────────────────────────────────

const explainStep = createStep({
  id: 'explain',
  inputSchema: z.object({
    intent: z.string(),
    scenePlan: scenePlanSchema,
  }),
  outputSchema: z.object({
    explanation: z.string(),
  }),
  execute: async ({ inputData }) => {
    const prompt = `User intent: "${inputData.intent}"\nValidated scene plan: ${JSON.stringify(inputData.scenePlan)}\nWrite the explanation.`;
    const result = await timedModelCall(
      'generate.explain explainer',
      () => explainerAgent.generate(prompt),
    );
    return { explanation: result.text };
  },
});

// ─── Step 3: Coherence Check ───────────────────────────────────────────────────
// Validates intent↔plan↔explanation triangle. Re-explains up to 3x if incoherent.

const coherenceStep = createStep({
  id: 'coherence',
  inputSchema: z.object({
    intent: z.string(),
    scenePlan: scenePlanSchema,
    explanation: z.string(),
  }),
  outputSchema: z.object({
    coherent: z.boolean(),
    explanation: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { intent, scenePlan, explanation } = inputData;
    let currentExplanation = explanation;

    for (let attempt = 0; attempt < 3; attempt++) {
      const prompt = `User intent: "${intent}"\nScene plan: ${JSON.stringify(scenePlan)}\nExplanation: "${currentExplanation}"\nIs this coherent? Respond with JSON: { "coherent": true/false, "reason": "..." }`;
      const result = await timedModelCall(
        `generate.coherence validator attempt ${attempt + 1}/3`,
        () => coherenceAgent.generate(prompt),
      );

      const text = result.text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.coherent === true) {
            return { coherent: true, explanation: currentExplanation };
          }
        } catch {}
      }

      // If text simply states coherent
      if (text.toLowerCase().includes('coherent: true') || text.toLowerCase().includes('"coherent":true')) {
        return { coherent: true, explanation: currentExplanation };
      }

      // Re-explain if incoherent and retries remain
      if (attempt < 2) {
        const reExplain = await timedModelCall(
          `generate.coherence re-explain attempt ${attempt + 1}/3`,
          () => explainerAgent.generate(
            `User intent: "${intent}"\nScene plan: ${JSON.stringify(scenePlan)}\nPrevious explanation was incoherent. Feedback: ${result.text}\nWrite a better explanation.`
          ),
        );
        currentExplanation = reExplain.text;
      }
    }

    return { coherent: false, explanation: currentExplanation };
  },
});

// ─── Step 4: Architect ─────────────────────────────────────────────────────────
// Generates the Three.js HTML code from plan + explanation + history.

const architectStep = createStep({
  id: 'architect',
  inputSchema: z.object({
    intent: z.string(),
    scenePlan: scenePlanSchema,
    explanation: z.string(),
    currentCode: z.string().optional(),
    history: z.array(z.object({
      role: z.string(),
      text: z.string(),
    })).optional(),
  }),
  outputSchema: z.object({
    code: z.string(),
    metadata: z.any().nullable(),
    explanation: z.string(),
    scenePlan: scenePlanSchema,
  }),
  execute: async ({ inputData }) => {
    const { intent, scenePlan, explanation, currentCode, history } = inputData;

    let prompt = `Scene plan: ${JSON.stringify(scenePlan)}\nExplanation: ${explanation}\nUser intent: "${intent}"`;
    if (currentCode) {
      prompt += `\n\nCurrent code:\n${currentCode}`;
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
    messages.push({ role: 'user', content: prompt });

    const result = await timedModelCall(
      'generate.architect',
      () => architectAgent.generate(messages),
    );

    // Extract HTML from triple backticks
    const codeMatch = result.text.match(/```(?:html)?\s*([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1].trim() : result.text;

    // Extract metadata
    let metadata = null;
    const metaMatch = result.text.match(/\[METADATA\]([\s\S]*?)\[\/METADATA\]/);
    if (metaMatch) {
      try {
        metadata = JSON.parse(metaMatch[1].trim());
      } catch {}
    }

    return { code, metadata, explanation, scenePlan };
  },
});

// ─── Workflow Composition ──────────────────────────────────────────────────────

export const generateWorkflow = createWorkflow({
  id: 'generate',
  inputSchema: z.object({
    intent: z.string(),
    currentCode: z.string().optional(),
    history: z.array(z.object({
      role: z.string(),
      text: z.string(),
    })).optional(),
    image: z.object({
      data: z.string(),
      mimeType: z.string(),
    }).optional(),
  }),
  outputSchema: z.object({
    code: z.string(),
    metadata: z.any().nullable(),
    explanation: z.string(),
    scenePlan: scenePlanSchema,
  }),
})
  .map(async ({ getInitData }) => {
    const init = getInitData<{ intent: string }>();
    return { intent: init.intent };
  })
  .then(planStep)
  .map(async ({ inputData, getInitData }) => {
    const init = getInitData<{ intent: string }>();
    return {
      intent: init.intent,
      scenePlan: inputData.scenePlan,
    };
  })
  .then(explainStep)
  .map(async ({ inputData, getInitData, getStepResult }) => {
    const init = getInitData<{ intent: string }>();
    const planResult = getStepResult(planStep);
    return {
      intent: init.intent,
      scenePlan: planResult.scenePlan,
      explanation: inputData.explanation,
    };
  })
  .then(coherenceStep)
  .map(async ({ inputData, getInitData, getStepResult }) => {
    const init = getInitData<{ intent: string; currentCode?: string; history?: Array<{ role: string; text: string }> }>();
    const planResult = getStepResult(planStep);
    return {
      intent: init.intent,
      scenePlan: planResult.scenePlan,
      explanation: inputData.explanation,
      currentCode: init.currentCode,
      history: init.history,
    };
  })
  .then(architectStep)
  .commit();
