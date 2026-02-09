import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const EXPRESS_URL = 'http://localhost:3000';

export const fetchCatalogTool = createTool({
  id: 'fetch-catalog',
  description: 'Fetch the full snippet catalog (key, description, tags, sceneHash) from the database. No code is returned — lightweight for matching.',
  inputSchema: z.object({}),
  outputSchema: z.array(z.object({
    key: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    sceneHash: z.string().nullable().optional(),
  })),
  execute: async () => {
    const res = await fetch(`${EXPRESS_URL}/snippets/catalog`);
    const rows = await res.json();
    return rows.map((row: any) => ({
      key: row.key,
      description: row.description,
      tags: Array.isArray(row.tags) ? row.tags : [],
      sceneHash: row.scene_hash ?? null,
    }));
  },
});

export const fetchSnippetTool = createTool({
  id: 'fetch-snippet',
  description: 'Fetch a single snippet by exact key. Returns the key and full code.',
  inputSchema: z.object({
    key: z.string().describe('The exact snippet key to look up'),
  }),
  outputSchema: z.object({
    key: z.string(),
    code: z.string(),
    sceneHash: z.string().nullable().optional(),
  }).nullable(),
  execute: async ({ key }) => {
    const res = await fetch(`${EXPRESS_URL}/snippets/key/${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    const row = await res.json();
    return {
      key: row.key,
      code: row.code,
      sceneHash: row.scene_hash ?? null,
    };
  },
});

export const fetchArtifactBySceneHashTool = createTool({
  id: 'fetch-artifact-by-scene-hash',
  description: 'Fetch a render artifact by sceneHash, including its stored scene plan and render details.',
  inputSchema: z.object({
    sceneHash: z.string(),
  }),
  outputSchema: z.object({
    sceneHash: z.string(),
    scenePlan: z.record(z.unknown()),
    parentSceneHash: z.string().nullable().optional(),
    renderCode: z.string(),
    intent: z.string(),
    modelExplanation: z.string().nullable().optional(),
    schemaVersion: z.string(),
    modelVersion: z.string(),
    promptVersion: z.string(),
    updateClassification: z.enum(['simple_code_only', 'simple_param_patch', 'structural_major']).nullable().optional(),
  }).nullable(),
  execute: async ({ sceneHash }) => {
    const res = await fetch(`${EXPRESS_URL}/artifacts/${encodeURIComponent(sceneHash)}`);
    if (!res.ok) return null;
    const row = await res.json();
    return {
      sceneHash: row.scene_hash,
      scenePlan: row.scene_plan,
      parentSceneHash: row.parent_scene_hash ?? null,
      renderCode: row.render_code,
      intent: row.intent,
      modelExplanation: row.model_explanation ?? null,
      schemaVersion: row.schema_version,
      modelVersion: row.model_version,
      promptVersion: row.prompt_version,
      updateClassification: row.update_classification ?? null,
    };
  },
});

export const storeArtifactTool = createTool({
  id: 'store-artifact',
  description: 'Log a rendered visualization artifact to the database for tracking and quality feedback.',
  inputSchema: z.object({
    scenePlan: z.record(z.unknown()),
    parentSceneHash: z.string().optional(),
    renderCode: z.string(),
    intent: z.string(),
    modelExplanation: z.string().optional(),
    schemaVersion: z.string(),
    modelVersion: z.string(),
    promptVersion: z.string(),
    updateClassification: z.enum(['simple_code_only', 'simple_param_patch', 'structural_major']).optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    sceneHash: z.string(),
  }),
  execute: async (inputData) => {
    const res = await fetch(`${EXPRESS_URL}/artifacts/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputData),
    });
    return await res.json();
  },
});

export const submitFeedbackTool = createTool({
  id: 'submit-feedback',
  description: 'Submit user quality feedback (good/bad) for a rendered artifact. Good feedback saves the snippet to the library.',
  inputSchema: z.object({
    sceneHash: z.string().optional(),
    scenePlan: z.record(z.unknown()).optional(),
    renderCode: z.string().optional(),
    schemaVersion: z.string().optional(),
    key: z.string().optional(),
    description: z.string().optional(),
    code: z.string().optional(),
    tags: z.array(z.string()).optional(),
    feedback: z.enum(['good', 'bad']),
    reason: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    sceneHash: z.string(),
    feedback: z.string(),
  }),
  execute: async (inputData) => {
    const res = await fetch(`${EXPRESS_URL}/artifacts/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputData),
    });
    return await res.json();
  },
});
