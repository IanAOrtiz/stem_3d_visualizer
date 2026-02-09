import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { updateClassifierAgent } from '../agents/update-classifier';
import { updatePlannerAgent } from '../agents/update-planner';
import { explainerAgent } from '../agents/explainer';
import { coherenceAgent } from '../agents/coherence';
import { architectAgent } from '../agents/architect';
import { validatePlanTool } from '../tools/validate-plan';
import { fetchArtifactBySceneHashTool } from '../tools/snippets';

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

const MAX_PLAN_UPDATE_ATTEMPTS = 3;

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

const updateClassificationSchema = z.enum([
  'simple_code_only',
  'simple_param_patch',
  'structural_major',
]);

const updateDecisionSchema = z.object({
  updateClassification: updateClassificationSchema,
  reason: z.string(),
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

const loadParentArtifactStep = createStep({
  id: 'load-parent-artifact',
  inputSchema: z.object({
    parentSceneHash: z.string(),
  }),
  outputSchema: z.object({
    parentArtifact: z.object({
      sceneHash: z.string(),
      scenePlan: scenePlanSchema,
      renderCode: z.string(),
      intent: z.string(),
      schemaVersion: z.string(),
      modelVersion: z.string(),
      promptVersion: z.string(),
    }),
  }),
  execute: async ({ inputData }) => {
    const artifact = await fetchArtifactBySceneHashTool.execute({ sceneHash: inputData.parentSceneHash }, {});
    if (!artifact) {
      throw new Error(`Parent artifact not found for sceneHash="${inputData.parentSceneHash}"`);
    }

    const parsed = scenePlanSchema.safeParse(artifact.scenePlan);
    if (!parsed.success) {
      throw new Error('Parent artifact contains invalid scene_plan');
    }

    return {
      parentArtifact: {
        sceneHash: artifact.sceneHash,
        scenePlan: parsed.data,
        renderCode: artifact.renderCode,
        intent: artifact.intent,
        schemaVersion: artifact.schemaVersion,
        modelVersion: artifact.modelVersion,
        promptVersion: artifact.promptVersion,
      },
    };
  },
});

const classifyUpdateStep = createStep({
  id: 'classify-update',
  inputSchema: z.object({
    intent: z.string(),
    parentScenePlan: scenePlanSchema,
    currentCode: z.string().optional(),
    targetParameters: z.record(z.number()).optional(),
  }),
  outputSchema: updateDecisionSchema,
  execute: async ({ inputData }) => {
    if (inputData.targetParameters && Object.keys(inputData.targetParameters).length > 0) {
      return {
        updateClassification: 'simple_param_patch',
        reason: 'Explicit parameter patch input provided by control panel.',
      };
    }

    const prompt = [
      `Delta intent: "${inputData.intent}"`,
      `Parent scene plan: ${JSON.stringify(inputData.parentScenePlan)}`,
      inputData.currentCode ? `Current visualization code:\n${inputData.currentCode}` : '',
      '',
      'If this can be solved without changing scene semantics or scene plan parameters, choose simple_code_only.',
    ].filter(Boolean).join('\n\n');

    const result = await timedModelCall(
      'update.classify classifier',
      () => updateClassifierAgent.generate(prompt),
    );
    const parsed = updateDecisionSchema.safeParse(extractJson(result.text));

    if (!parsed.success) {
      return {
        updateClassification: 'structural_major',
        reason: 'Classifier returned invalid output; escalated to structural_major.',
      };
    }

    return parsed.data;
  },
});

const planUpdateStep = createStep({
  id: 'plan-update',
  inputSchema: z.object({
    intent: z.string(),
    parentScenePlan: scenePlanSchema,
    allowConceptChange: z.boolean(),
    updateClassification: updateClassificationSchema,
    targetParameters: z.record(z.number()).optional(),
  }),
  outputSchema: z.object({
    scenePlan: scenePlanSchema,
  }),
  execute: async ({ inputData }) => {
    const { intent, parentScenePlan, allowConceptChange, updateClassification, targetParameters } = inputData;

    if (updateClassification === 'simple_code_only') {
      return { scenePlan: parentScenePlan };
    }

    if (
      updateClassification === 'simple_param_patch' &&
      targetParameters &&
      Object.keys(targetParameters).length > 0
    ) {
      const patchedPlan = {
        concept: parentScenePlan.concept,
        schemaVersion: parentScenePlan.schemaVersion,
        parameters: {
          ...(parentScenePlan.parameters || {}),
          ...targetParameters,
        },
      };

      const validation = await validatePlanTool.execute(patchedPlan, {});
      if (!validation.valid || !validation.canonicalScenePlan) {
        throw new Error(`Parameter patch validation failed: ${(validation.errors || []).join('; ')}`);
      }

      return { scenePlan: validation.canonicalScenePlan };
    }

    let lastErrors: string[] = [];
    let lastCandidate: unknown = null;
    let lastRawOutput = '';

    for (let attempt = 0; attempt < MAX_PLAN_UPDATE_ATTEMPTS; attempt++) {
      const attemptNumber = attempt + 1;
      const promptParts = [
        `Delta intent: "${intent}"`,
        `Parent scene plan: ${JSON.stringify(parentScenePlan)}`,
        `allowConceptChange: ${allowConceptChange}`,
        `updateClassification: ${updateClassification}`,
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
        `update.plan planner attempt ${attemptNumber}/${MAX_PLAN_UPDATE_ATTEMPTS}`,
        () => updatePlannerAgent.generate(prompt),
      );
      lastRawOutput = result.text;
      const json = extractJson(result.text);

      if (!json) {
        lastErrors = ['Planner response did not contain valid JSON'];
        lastCandidate = result.text;
        continue;
      }

      lastCandidate = json;

      const validation = await validatePlanTool.execute(json, {});
      if (!validation.valid || !validation.canonicalScenePlan) {
        lastErrors = validation.errors && validation.errors.length > 0
          ? validation.errors
          : ['Validation failed with no diagnostics returned'];
        continue;
      }

      const nextPlan = validation.canonicalScenePlan;

      if (!allowConceptChange) {
        if (nextPlan.concept !== parentScenePlan.concept || nextPlan.schemaVersion !== parentScenePlan.schemaVersion) {
          lastErrors = [
            `Concept/schema change is blocked when allowConceptChange=false. Parent=${parentScenePlan.concept}/${parentScenePlan.schemaVersion}, Next=${nextPlan.concept}/${nextPlan.schemaVersion}`,
          ];
          continue;
        }
      }

      if (updateClassification === 'simple_param_patch') {
        if (nextPlan.concept !== parentScenePlan.concept || nextPlan.schemaVersion !== parentScenePlan.schemaVersion) {
          lastErrors = ['simple_param_patch must preserve concept and schemaVersion.'];
          continue;
        }
      }

      return { scenePlan: nextPlan };
    }

    throw new Error(`Updated scene plan failed after ${MAX_PLAN_UPDATE_ATTEMPTS} attempts: ${lastErrors.join('; ')}`);
  },
});

const explainUpdateStep = createStep({
  id: 'explain-update',
  inputSchema: z.object({
    intent: z.string(),
    scenePlan: scenePlanSchema,
    parentScenePlan: scenePlanSchema,
    updateClassification: updateClassificationSchema,
    classificationReason: z.string(),
  }),
  outputSchema: z.object({
    explanation: z.string(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.updateClassification === 'simple_code_only') {
      return {
        explanation: `Code-only refinement approved. Scene semantics locked; scene plan unchanged. Reason: ${inputData.classificationReason}`,
      };
    }

    const prompt = [
      `Delta intent: "${inputData.intent}"`,
      `Parent scene plan: ${JSON.stringify(inputData.parentScenePlan)}`,
      `Updated scene plan: ${JSON.stringify(inputData.scenePlan)}`,
      `Update classification: ${inputData.updateClassification}`,
      `Classification reason: ${inputData.classificationReason}`,
      'Explain what changed and why this supports the user intent.',
    ].join('\n\n');

    const result = await timedModelCall(
      'update.explain explainer',
      () => explainerAgent.generate(prompt),
    );
    return { explanation: result.text };
  },
});

const coherenceUpdateStep = createStep({
  id: 'coherence-update',
  inputSchema: z.object({
    intent: z.string(),
    scenePlan: scenePlanSchema,
    explanation: z.string(),
    updateClassification: updateClassificationSchema,
  }),
  outputSchema: z.object({
    explanation: z.string(),
  }),
  execute: async ({ inputData }) => {
    if (inputData.updateClassification === 'simple_code_only') {
      return { explanation: inputData.explanation };
    }

    const prompt = `User intent: "${inputData.intent}"\nScene plan: ${JSON.stringify(inputData.scenePlan)}\nExplanation: "${inputData.explanation}"\nRespond with JSON: { "coherent": true/false, "reason": "..." }`;
    const result = await timedModelCall(
      'update.coherence validator',
      () => coherenceAgent.generate(prompt),
    );
    const parsed = extractJson(result.text) as { coherent?: boolean; reason?: string } | null;

    if (parsed?.coherent === true) {
      return { explanation: inputData.explanation };
    }

    const reason = parsed?.reason || 'Coherence validation failed';
    throw new Error(`Update coherence failed: ${reason}`);
  },
});

const architectUpdateStep = createStep({
  id: 'architect-update',
  inputSchema: z.object({
    intent: z.string(),
    scenePlan: scenePlanSchema,
    parentScenePlan: scenePlanSchema,
    explanation: z.string(),
    updateClassification: updateClassificationSchema,
    currentCode: z.string(),
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
    updateClassification: updateClassificationSchema,
    semanticLockApplied: z.boolean(),
    requiresPipeline: z.boolean(),
  }),
  execute: async ({ inputData }) => {
    const { intent, scenePlan, parentScenePlan, explanation, updateClassification, currentCode, history } = inputData;

    let prompt = '';
    if (updateClassification === 'simple_code_only') {
      prompt = [
        'You are executing a simple_code_only update with semantic lock.',
        'Strict rules:',
        '- DO NOT change scene semantics, physical behavior, equations, state transitions, or parameter values.',
        '- DO NOT alter the concept/schema/parameters described in the parent scene plan.',
        '- Only apply presentational/refactoring changes needed by user intent.',
        `Parent scene plan (locked): ${JSON.stringify(parentScenePlan)}`,
        `Current code:\n${currentCode}`,
        `User update intent: "${intent}"`,
      ].join('\n\n');
    } else {
      prompt = [
        `Updated scene plan: ${JSON.stringify(scenePlan)}`,
        `Parent scene plan: ${JSON.stringify(parentScenePlan)}`,
        `Explanation: ${explanation}`,
        `User update intent: "${intent}"`,
        `Current code:\n${currentCode}`,
      ].join('\n\n');
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
      'update.architect',
      () => architectAgent.generate(messages),
    );

    const codeMatch = result.text.match(/```(?:html)?\s*([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1].trim() : result.text;

    let metadata: any = null;
    const metaMatch = result.text.match(/\[METADATA\]([\s\S]*?)\[\/METADATA\]/);
    if (metaMatch) {
      try {
        metadata = JSON.parse(metaMatch[1].trim());
      } catch {
        metadata = null;
      }
    }

    return {
      code,
      metadata,
      explanation,
      scenePlan,
      updateClassification,
      semanticLockApplied: updateClassification === 'simple_code_only',
      requiresPipeline: updateClassification !== 'simple_code_only',
    };
  },
});

export const updateWorkflow = createWorkflow({
  id: 'update',
  inputSchema: z.object({
    intent: z.string(),
    parentSceneHash: z.string(),
    currentCode: z.string().optional(),
    history: z.array(z.object({
      role: z.string(),
      text: z.string(),
    })).optional(),
    allowConceptChange: z.boolean().default(false),
    targetParameters: z.record(z.number()).optional(),
  }),
  outputSchema: z.object({
    code: z.string(),
    metadata: z.any().nullable(),
    explanation: z.string(),
    scenePlan: scenePlanSchema,
    parentSceneHash: z.string(),
    updateClassification: updateClassificationSchema,
    semanticLockApplied: z.boolean(),
    requiresPipeline: z.boolean(),
  }),
})
  .map(async ({ getInitData }) => {
    const init = getInitData<{ parentSceneHash: string }>();
    return { parentSceneHash: init.parentSceneHash };
  })
  .then(loadParentArtifactStep)
  .map(async ({ inputData, getInitData }) => {
    const init = getInitData<{ intent: string; currentCode?: string; targetParameters?: Record<string, number> }>();
    return {
      intent: init.intent,
      currentCode: init.currentCode,
      parentScenePlan: inputData.parentArtifact.scenePlan,
      targetParameters: init.targetParameters,
    };
  })
  .then(classifyUpdateStep)
  .map(async ({ inputData, getInitData, getStepResult }) => {
    const init = getInitData<{ intent: string; allowConceptChange?: boolean; targetParameters?: Record<string, number> }>();
    const parent = getStepResult(loadParentArtifactStep).parentArtifact;
    return {
      intent: init.intent,
      parentScenePlan: parent.scenePlan,
      allowConceptChange: init.allowConceptChange ?? false,
      updateClassification: inputData.updateClassification,
      targetParameters: init.targetParameters,
    };
  })
  .then(planUpdateStep)
  .map(async ({ inputData, getInitData, getStepResult }) => {
    const init = getInitData<{ intent: string }>();
    const parent = getStepResult(loadParentArtifactStep).parentArtifact;
    const classification = getStepResult(classifyUpdateStep);
    return {
      intent: init.intent,
      scenePlan: inputData.scenePlan,
      parentScenePlan: parent.scenePlan,
      updateClassification: classification.updateClassification,
      classificationReason: classification.reason,
    };
  })
  .then(explainUpdateStep)
  .map(async ({ inputData, getInitData, getStepResult }) => {
    const init = getInitData<{ intent: string }>();
    const plan = getStepResult(planUpdateStep).scenePlan;
    const classification = getStepResult(classifyUpdateStep);
    return {
      intent: init.intent,
      scenePlan: plan,
      explanation: inputData.explanation,
      updateClassification: classification.updateClassification,
    };
  })
  .then(coherenceUpdateStep)
  .map(async ({ inputData, getInitData, getStepResult }) => {
    const init = getInitData<{ intent: string; currentCode?: string; history?: Array<{ role: string; text: string }> }>();
    const parent = getStepResult(loadParentArtifactStep).parentArtifact;
    const plan = getStepResult(planUpdateStep).scenePlan;
    const classification = getStepResult(classifyUpdateStep);

    return {
      intent: init.intent,
      scenePlan: plan,
      parentScenePlan: parent.scenePlan,
      explanation: inputData.explanation,
      updateClassification: classification.updateClassification,
      currentCode: init.currentCode || parent.renderCode,
      history: init.history,
    };
  })
  .then(architectUpdateStep)
  .map(async ({ inputData, getStepResult }) => {
    const parent = getStepResult(loadParentArtifactStep).parentArtifact;
    return {
      code: inputData.code,
      metadata: inputData.metadata,
      explanation: inputData.explanation,
      scenePlan: inputData.scenePlan,
      parentSceneHash: parent.sceneHash,
      updateClassification: inputData.updateClassification,
      semanticLockApplied: inputData.semanticLockApplied,
      requiresPipeline: inputData.requiresPipeline,
    };
  })
  .commit();
