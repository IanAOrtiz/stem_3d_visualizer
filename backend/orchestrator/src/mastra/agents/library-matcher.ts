import { Agent } from '@mastra/core/agent';
import { LIBRARY_MATCHER_INSTRUCTION } from '../prompts';
import { fetchCatalogTool, fetchSnippetTool } from '../tools/snippets';
import { withTelemetry } from '../utils/telemetry';

export const libraryMatcherAgent = withTelemetry(
  new Agent({
    id: 'library-matcher',
    name: 'Library Matcher',
    instructions: LIBRARY_MATCHER_INSTRUCTION,
    model: 'google/gemini-3-flash-preview',
    tools: { fetchCatalogTool, fetchSnippetTool },
  }),
  'library-matcher',
  'google/gemini-3-flash-preview',
);
