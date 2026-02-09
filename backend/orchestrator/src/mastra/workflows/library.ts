import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { libraryMatcherAgent } from '../agents/library-matcher';
import { fetchCatalogTool, fetchSnippetTool } from '../tools/snippets';

// ─── Step 1: Match ─────────────────────────────────────────────────────────────
// Fetches catalog from Express, then asks library-matcher agent to find a match.

const matchStep = createStep({
  id: 'match',
  inputSchema: z.object({
    intent: z.string(),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    key: z.string().optional(),
    reason: z.string(),
  }),
  execute: async ({ inputData }) => {
    let catalog;
    try {
      catalog = await fetchCatalogTool.execute({}, {});
    } catch {
      return { found: false, reason: 'Could not load catalog from backend' };
    }

    if (!catalog || !Array.isArray(catalog) || catalog.length === 0) {
      return { found: false, reason: 'Catalog is empty' };
    }

    const prompt = `User intent: "${inputData.intent}"\n\nSnippet catalog:\n${JSON.stringify(catalog, null, 2)}\n\nRespond with JSON only: { "matched": true/false, "key": "snippet_key_if_matched", "reason": "why" }`;
    const result = await libraryMatcherAgent.generate(prompt);

    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { found: false, reason: 'Failed to parse matcher response' };
    }

    try {
      const match = JSON.parse(jsonMatch[0]);
      return {
        found: !!match.matched,
        key: match.key,
        reason: match.reason || '',
      };
    } catch {
      return { found: false, reason: 'Failed to parse matcher response' };
    }
  },
});

// ─── Step 2: Fetch ─────────────────────────────────────────────────────────────
// If matched, fetches the snippet code from Express.

const fetchStep = createStep({
  id: 'fetch',
  inputSchema: z.object({
    found: z.boolean(),
    key: z.string().optional(),
    reason: z.string(),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    code: z.string().optional(),
    key: z.string().optional(),
    sceneHash: z.string().nullable().optional(),
    reason: z.string(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData.found || !inputData.key) {
      return { found: false, reason: inputData.reason };
    }

    try {
      const snippet = await fetchSnippetTool.execute({ key: inputData.key }, {});
      if (!snippet) {
        return { found: false, reason: `Snippet "${inputData.key}" not found in database` };
      }
      return {
        found: true,
        code: snippet.code,
        key: snippet.key,
        sceneHash: snippet.sceneHash ?? null,
        reason: inputData.reason,
      };
    } catch {
      return { found: false, reason: `Failed to fetch snippet "${inputData.key}"` };
    }
  },
});

// ─── Workflow Composition ──────────────────────────────────────────────────────

export const libraryWorkflow = createWorkflow({
  id: 'library',
  inputSchema: z.object({
    intent: z.string(),
  }),
  outputSchema: z.object({
    found: z.boolean(),
    code: z.string().optional(),
    key: z.string().optional(),
    sceneHash: z.string().nullable().optional(),
    reason: z.string(),
  }),
})
  .then(matchStep)
  .then(fetchStep)
  .commit();
