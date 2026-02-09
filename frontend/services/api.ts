// Thin HTTP client for Mastra backend (replaces direct Gemini SDK calls).
// All AI operations go through Mastra at port 4111.
// DB operations (feedback, artifact validation) still go to Express at port 3000.

const MASTRA_URL = import.meta.env.VITE_MASTRA_URL || 'http://localhost:4111';
const EXPRESS_URL = import.meta.env.VITE_EXPRESS_URL || 'http://localhost:3000';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface GenerateResult {
  code: string;
  metadata: any;
  explanation: string;
  scenePlan: any;
}

export interface LibraryResult {
  found: boolean;
  code?: string;
  key?: string;
  sceneHash?: string | null;
  reason: string;
}

export interface UpdateResult {
  code: string;
  metadata: any;
  explanation: string;
  scenePlan: any;
  parentSceneHash: string;
  updateClassification: 'simple_code_only' | 'simple_param_patch' | 'structural_major';
  semanticLockApplied: boolean;
  requiresPipeline: boolean;
}

export interface TutorToolCall {
  name: string;
  args: Record<string, any>;
}

export interface TutorResponse {
  text: string;
  toolCalls: TutorToolCall[];
  suggestedEdit?: string;
  shouldAutoApplyEdit: boolean;
  suggestEditReason?: string;
}

export interface CameraSettings {
  position: { x: number; y: number; z: number };
  target: { x: number; y: number; z: number };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function agentGenerate(
  agentId: string,
  messages: any,
  options?: Record<string, any>,
  signal?: AbortSignal,
) {
  const res = await fetch(`${MASTRA_URL}/api/agents/${agentId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ messages, ...options }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Agent ${agentId} generate failed: ${err}`);
  }
  return await res.json();
}

async function workflowStart(
  workflowId: string,
  inputData: Record<string, any>,
  signal?: AbortSignal,
) {
  const res = await fetch(`${MASTRA_URL}/api/workflows/${workflowId}/start-async`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ inputData }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Workflow ${workflowId} start failed: ${err}`);
  }
  return await res.json();
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Run the full generate pipeline (plan → validate → explain → coherence → architect).
 */
export async function generateVisualization(
  intent: string,
  currentCode?: string,
  history?: Array<{ role: string; text: string }>,
  image?: { data: string; mimeType: string },
  signal?: AbortSignal,
): Promise<GenerateResult> {
  const result = await workflowStart('generate', {
    intent,
    currentCode,
    history,
    image,
  }, signal);

  // The workflow result contains steps with their outputs.
  // Extract the final architect step output.
  const steps = result?.steps;
  if (steps?.architect?.output) {
    return steps.architect.output;
  }

  // Fallback: try to find the result at the top level
  if (result?.result) {
    return result.result;
  }

  // Last resort: return the raw result
  return result;
}

/**
 * Library mode: match intent against snippet catalog and fetch if found.
 */
export async function libraryLookup(intent: string, signal?: AbortSignal): Promise<LibraryResult> {
  const result = await workflowStart('library', { intent }, signal);

  const steps = result?.steps;
  if (steps?.fetch?.output) {
    return steps.fetch.output;
  }

  if (result?.result) {
    return result.result;
  }

  return result;
}

/**
 * Run the update pipeline (artifact lookup -> classify -> plan edit -> validate -> explain -> coherence -> architect).
 */
export async function updateVisualization(
  intent: string,
  parentSceneHash: string,
  currentCode?: string,
  history?: Array<{ role: string; text: string }>,
  allowConceptChange: boolean = false,
  targetParameters?: Record<string, number>,
): Promise<UpdateResult> {
  const result = await workflowStart('update', {
    intent,
    parentSceneHash,
    currentCode,
    history,
    allowConceptChange,
    targetParameters,
  });

  const steps = result?.steps;
  if (steps?.['architect-update']?.output) {
    return steps['architect-update'].output;
  }

  if (result?.result) {
    return result.result;
  }

  return result;
}

/**
 * Send a message to the Spaide Assistant (tutor agent with function calling).
 */
export async function sendTutorMessage(
  history: Array<{ role: string; content: string }>,
  message: string,
  currentCode: string,
  signal?: AbortSignal,
): Promise<TutorResponse> {
  const workflowResult = await workflowStart('spaide', {
    intent: message,
    currentCode,
    history: history.map(h => ({
      role: h.role,
      text: h.content,
    })),
  }, signal);

  const output = workflowResult?.steps?.tutor?.output || workflowResult?.result || workflowResult;
  const text = output?.response || '';
  const toolCalls: TutorToolCall[] = [];

  if (output?.camera?.active && output?.camera?.intent) {
    toolCalls.push({
      name: 'adjust-camera',
      args: {
        intent: output.camera.intent,
        position: output.camera.position,
        target: output.camera.target,
      },
    });
  }

  if (output?.time?.active && typeof output?.time?.t === 'number') {
    toolCalls.push({
      name: 'update-simulation-time',
      args: { t: output.time.t },
    });
  }

  const editMatch = text.match(/\[SUGGESTED_EDIT\]([\s\S]*?)\[\/SUGGESTED_EDIT\]/i);
  const suggestedEdit = editMatch ? editMatch[1].trim() : undefined;
  const shouldAutoApplyEdit = Boolean(output?.suggestEdit?.active && suggestedEdit);

  return {
    text,
    toolCalls,
    suggestedEdit,
    shouldAutoApplyEdit,
    suggestEditReason: output?.suggestEdit?.reason,
  };
}

/**
 * Ask the cameraman agent for camera position and target vectors.
 */
export async function sendCameraManMessage(
  intent: string,
  currentCode: string,
  signal?: AbortSignal,
): Promise<CameraSettings | null> {
  try {
    const result = await agentGenerate('cameraman', [
      {
        role: 'user',
        content: `INTENT: "${intent}"\nSOURCE CODE:\n${currentCode}`,
      },
    ], undefined, signal);

    const text = result.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Apply a refinement edit to existing code via the architect agent.
 */
export async function applyEdit(
  currentCode: string,
  editPrompt: string
): Promise<{ text: string }> {
  const result = await agentGenerate('architect', [
    {
      role: 'user',
      content: `SOURCE:\n${currentCode}\n\nARCHITECT_PROMPT: ${editPrompt}`,
    },
  ]);

  return { text: result.text || '' };
}

/**
 * Store an artifact via Express backend.
 */
export async function storeArtifact(payload: {
  scenePlan: Record<string, any>;
  parentSceneHash?: string;
  renderCode: string;
  intent: string;
  modelExplanation?: string;
  schemaVersion: string;
  modelVersion: string;
  promptVersion: string;
  updateClassification?: 'simple_code_only' | 'simple_param_patch' | 'structural_major';
}) {
  const res = await fetch(`${EXPRESS_URL}/artifacts/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

/**
 * Submit quality feedback via Express backend.
 */
export async function submitFeedback(payload: {
  sceneHash?: string;
  scenePlan?: Record<string, any>;
  renderCode?: string;
  schemaVersion?: string;
  key?: string;
  description?: string;
  code?: string;
  tags?: string[];
  feedback: 'good' | 'bad';
  reason?: string;
}) {
  const res = await fetch(`${EXPRESS_URL}/artifacts/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Feedback submission failed');
  }
  return await res.json();
}
