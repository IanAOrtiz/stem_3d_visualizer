/**
 * exportTrainingData.js — Vertex AI JSONL training data exporter.
 *
 * This is the final stage of the training data pipeline:
 *
 *   User prompt → Planner → Validator → Explainer → Coherence → Architect
 *        ↓                                                          ↓
 *   render_artifacts table  ←──────────────────────────────────────┘
 *        ↓
 *   Human feedback (quality_label: 'good' | 'bad' | null)
 *        ↓
 *   THIS MODULE → JSONL files → Vertex AI Gemini supervised fine-tuning
 *
 * All artifacts are exported (good, bad, and unlabeled) with a _metadata
 * field so the model can learn what makes a visualization good AND bad.
 * Vertex AI ignores unknown top-level fields like _metadata.
 *
 * Three export shapes are supported:
 *   - planner:       intent → scene plan JSON
 *   - architect:     intent + plan + explanation → render code
 *   - full_pipeline: intent → plan + explanation + code (end-to-end)
 */

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getTrainingArtifacts } from "./retrieve.js";
import {
  PLANNER_SYSTEM_PROMPT,
  ARCHITECT_SYSTEM_PROMPT,
  FULL_PIPELINE_SYSTEM_PROMPT,
} from "./systemPrompts.js";

const VALID_SHAPES = ["planner", "architect", "full_pipeline"];

/**
 * Build the _metadata object attached to every JSONL line.
 * Vertex AI ignores this; it's for dataset analysis, filtering, and DPO pairing.
 */
function buildMetadata(artifact) {
  return {
    scene_hash: artifact.scene_hash,
    quality_label: artifact.quality_label || null,
    quality_reason: artifact.quality_reason || null,
    concept: artifact.scene_plan?.concept || null,
    schema_version: artifact.schema_version,
    created_at: artifact.created_at,
  };
}

/**
 * Strip parameterControlSpecs from a scene plan before export.
 * The validator adds these; the planner doesn't produce them.
 */
function stripControlSpecs(scenePlan) {
  if (!scenePlan) return scenePlan;
  const { parameterControlSpecs, ...rest } = scenePlan;
  return rest;
}

/**
 * Format one DB row into a Vertex AI JSONL object for a given shape.
 * Returns null if the artifact lacks required fields for that shape.
 */
export function formatArtifactForShape(artifact, shape, includeSystemPrompt = true) {
  if (!VALID_SHAPES.includes(shape)) {
    throw new Error(`Invalid shape: ${shape}. Must be one of: ${VALID_SHAPES.join(", ")}`);
  }

  const intent = artifact.intent;
  if (!intent) return null;

  let systemPrompt;
  let userMessage;
  let modelMessage;

  if (shape === "planner") {
    if (!artifact.scene_plan) return null;

    systemPrompt = PLANNER_SYSTEM_PROMPT;
    userMessage = `User intent: "${intent}"`;
    modelMessage = JSON.stringify(stripControlSpecs(artifact.scene_plan));
  } else if (shape === "architect") {
    if (!artifact.scene_plan || !artifact.render_code || !artifact.model_explanation) return null;

    systemPrompt = ARCHITECT_SYSTEM_PROMPT;
    userMessage =
      `Scene plan: ${JSON.stringify(artifact.scene_plan)}\n` +
      `Explanation: ${artifact.model_explanation}\n` +
      `User intent: "${intent}"`;
    modelMessage = artifact.render_code;
  } else if (shape === "full_pipeline") {
    if (!artifact.scene_plan || !artifact.render_code || !artifact.model_explanation) return null;

    systemPrompt = FULL_PIPELINE_SYSTEM_PROMPT;
    userMessage = intent;
    modelMessage =
      `[SCENE_PLAN]${JSON.stringify(stripControlSpecs(artifact.scene_plan))}[/SCENE_PLAN]\n` +
      `[EXPLANATION]${artifact.model_explanation}[/EXPLANATION]\n` +
      `[CODE]${artifact.render_code}[/CODE]`;
  }

  const line = {
    contents: [
      { role: "user", parts: [{ text: userMessage }] },
      { role: "model", parts: [{ text: modelMessage }] },
    ],
    _metadata: buildMetadata(artifact),
  };

  if (includeSystemPrompt) {
    line.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  return line;
}

/**
 * Format an array of artifacts into a JSONL string (no disk I/O).
 * Skips artifacts that lack required fields for the given shape.
 */
export function formatArtifactsToJsonl(artifacts, shape, includeSystemPrompt = true) {
  const lines = [];
  for (const artifact of artifacts) {
    const formatted = formatArtifactForShape(artifact, shape, includeSystemPrompt);
    if (formatted) {
      lines.push(JSON.stringify(formatted));
    }
  }
  return lines.join("\n");
}

/**
 * Full pipeline: query DB → format → write JSONL file to disk.
 *
 * @param {object} options
 * @param {string} options.shape - "planner" | "architect" | "full_pipeline"
 * @param {string} [options.concept] - Filter by concept
 * @param {string} [options.qualityLabel] - Filter by quality label
 * @param {string} [options.dateFrom] - ISO date lower bound
 * @param {string} [options.dateTo] - ISO date upper bound
 * @param {boolean} [options.excludeSnippets=false] - Skip snippet-origin artifacts
 * @param {boolean} [options.includeSystemPrompt=true] - Include system instructions
 * @param {boolean} [options.dryRun=false] - Print stats without writing file
 * @param {string} [options.outDir] - Output directory (default: backend/exports/)
 * @returns {{ count: number, path: string|null, sample: object|null }}
 */
export async function exportTrainingData(options) {
  const {
    shape,
    concept,
    qualityLabel,
    dateFrom,
    dateTo,
    excludeSnippets = false,
    includeSystemPrompt = true,
    dryRun = false,
    outDir,
  } = options;

  if (!VALID_SHAPES.includes(shape)) {
    throw new Error(`Invalid shape: ${shape}. Must be one of: ${VALID_SHAPES.join(", ")}`);
  }

  const requireExplanation = shape === "architect" || shape === "full_pipeline";

  const artifacts = await getTrainingArtifacts({
    qualityLabel,
    concept,
    excludeSnippets,
    dateFrom,
    dateTo,
    requireExplanation,
  });

  const lines = [];
  let sample = null;

  for (const artifact of artifacts) {
    const formatted = formatArtifactForShape(artifact, shape, includeSystemPrompt);
    if (formatted) {
      if (!sample) sample = formatted;
      lines.push(JSON.stringify(formatted));
    }
  }

  if (dryRun) {
    return { count: lines.length, path: null, sample };
  }

  if (lines.length === 0) {
    return { count: 0, path: null, sample: null };
  }

  const exportDir = outDir || path.resolve(import.meta.dirname, "exports");
  await mkdir(exportDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `tuning_${shape}_${timestamp}_${lines.length}.jsonl`;
  const filePath = path.join(exportDir, filename);

  await writeFile(filePath, lines.join("\n") + "\n", "utf-8");

  return { count: lines.length, path: filePath, sample };
}
