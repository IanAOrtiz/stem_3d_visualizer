// Token usage logging and cost calculation for Gemini API calls.

// Pricing per 1M tokens (Gemini 2.5, under 200k context)
const PRICING: Record<string, { input: number; output: number; thinking: number }> = {
  'gemini-2.5-flash': { input: 0.15, output: 0.60, thinking: 0.375 },
  'gemini-2.5-pro':   { input: 1.25, output: 10.00, thinking: 3.125 },
};

interface Usage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
}

let sessionTotal = { inputTokens: 0, outputTokens: 0, reasoningTokens: 0, cost: 0 };

function costFor(model: string, usage: Usage): number {
  const p = PRICING[model] || PRICING['gemini-2.5-flash'];
  const input = (usage.inputTokens || 0) / 1_000_000 * p.input;
  const output = (usage.outputTokens || 0) / 1_000_000 * p.output;
  const thinking = (usage.reasoningTokens || 0) / 1_000_000 * p.thinking;
  return input + output + thinking;
}

export function logUsage(agent: string, model: string, usage: Usage) {
  const modelKey = model.replace('google/', '');
  const cost = costFor(modelKey, usage);

  sessionTotal.inputTokens += usage.inputTokens || 0;
  sessionTotal.outputTokens += usage.outputTokens || 0;
  sessionTotal.reasoningTokens += usage.reasoningTokens || 0;
  sessionTotal.cost += cost;

  console.log(
    `[TOKENS] ${agent} (${modelKey}) | in: ${usage.inputTokens ?? 0} out: ${usage.outputTokens ?? 0} think: ${usage.reasoningTokens ?? 0} | $${cost.toFixed(6)} | session: $${sessionTotal.cost.toFixed(6)}`
  );
}

/**
 * Patches agent.generate() to log token usage on every call.
 * Works for both workflow-internal calls and direct HTTP API calls.
 */
export function withTelemetry<T extends { generate: (...args: any[]) => Promise<any> }>(
  agent: T,
  label: string,
  model: string,
): T {
  const orig = agent.generate.bind(agent);
  (agent as any).generate = async (...args: any[]) => {
    const result = await orig(...args);
    if (result?.usage) {
      logUsage(label, model, result.usage);
    }
    return result;
  };
  return agent;
}
