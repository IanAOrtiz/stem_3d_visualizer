import 'dotenv/config';

import cors from "cors";
import express from "express";
import { getSnippetByKey, getSnippetsByIntent, getSnippetCatalog, insertSnippet, insertRenderArtifact, computeSceneHash, updateArtifactQuality, getArtifactBySceneHash, getTrainingArtifacts } from "./retrieve.js";
import { chooseSnippet } from "./chooseSnippet.js";
import { validateScenePlanPayload } from "./sceneValidators.js";
import { formatArtifactsToJsonl } from "./exportTrainingData.js";

const app = express();

app.use(express.json());

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

const PORT = 3000;


app.get("/snippets", async (req, res) => {
  const intent = req.query.intent;

  if (!intent) {
    return res.status(400).json({
      error: "Missing ?intent query parameter",
    });
  }

  try {
    const candidates = await getSnippetsByIntent(intent);

    if (candidates.length === 0) {
      return res.status(404).json({ error: "No snippets found" });
    }

    const chosenKey = await chooseSnippet(candidates, intent);
    const snippet = await getSnippetByKey(chosenKey);

    if (!snippet) {
      return res.status(404).json({ error: "Chosen snippet not found" });
    }

    res.json(snippet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Direct snippet lookup by exact key — no AI, no search.
app.get("/snippets/key/:key", async (req, res) => {
  try {
    const snippet = await getSnippetByKey(req.params.key);
    if (!snippet) {
      return res.status(404).json({ error: "Snippet not found" });
    }
    res.json(snippet);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Return all snippet keys + descriptions (no code). Lightweight catalog for the frontend library matcher.
app.get("/snippets/catalog", async (req, res) => {
  try {
    const catalog = await getSnippetCatalog();
    res.json(catalog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/artifacts/:sceneHash", async (req, res) => {
  try {
    const artifact = await getArtifactBySceneHash(req.params.sceneHash);
    if (!artifact) {
      return res.status(404).json({ error: "Artifact not found" });
    }
    res.json(artifact);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/artifacts/validate", async (req, res) => {
  const {
    scenePlan,
    parentSceneHash,
    renderCode,
    code,
    intent,
    modelExplanation,
    schemaVersion,
    modelVersion,
    promptVersion,
    updateClassification,
  } = req.body;
  const finalRenderCode = renderCode || code;

  if (!scenePlan || typeof scenePlan !== "object") {
    return res.status(400).json({ error: "Missing required field: scenePlan (object)" });
  }
  if (!finalRenderCode || typeof finalRenderCode !== "string") {
    return res.status(400).json({ error: "Missing required field: renderCode (or code)" });
  }
  if (!intent || typeof intent !== "string") {
    return res.status(400).json({ error: "Missing required field: intent" });
  }
  if (!schemaVersion || typeof schemaVersion !== "string") {
    return res.status(400).json({ error: "Missing required field: schemaVersion" });
  }
  if (!modelVersion || typeof modelVersion !== "string") {
    return res.status(400).json({ error: "Missing required field: modelVersion" });
  }
  if (!promptVersion || typeof promptVersion !== "string") {
    return res.status(400).json({ error: "Missing required field: promptVersion" });
  }

  try {
    const sceneHash = computeSceneHash({
      scenePlan,
      renderCode: finalRenderCode,
      schemaVersion,
    });

    await insertRenderArtifact({
      sceneHash,
      scenePlan,
      parentSceneHash: parentSceneHash || null,
      renderCode: finalRenderCode,
      intent,
      modelExplanation: modelExplanation || null,
      schemaVersion,
      modelVersion,
      promptVersion,
      updateClassification: updateClassification || null,
    });

    res.json({ success: true, sceneHash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/artifacts/feedback", async (req, res) => {
  const {
    key,
    description,
    code,
    tags,
    feedback,
    reason,
    sceneHash: providedSceneHash,
    scenePlan,
    renderCode,
    schemaVersion,
  } = req.body;

  if (!feedback) {
    return res.status(400).json({ error: "Missing required field: feedback" });
  }

  try {
    let sceneHash = providedSceneHash;
    if (!sceneHash) {
      if (!scenePlan || typeof scenePlan !== "object" || !(renderCode || code) || !schemaVersion) {
        return res.status(400).json({
          error: "Missing sceneHash. Provide sceneHash, or provide scenePlan + renderCode (or code) + schemaVersion.",
        });
      }
      sceneHash = computeSceneHash({
        scenePlan,
        renderCode: renderCode || code,
        schemaVersion,
      });
    }

    if (feedback === 'good' && key && code) {
      await insertSnippet({ key, description: description || '', code, tags: tags || [], sceneHash });
    }

    await updateArtifactQuality({
      sceneHash,
      qualityLabel: feedback,
      qualityReason: reason || null,
    });

    res.json({ success: true, sceneHash, feedback });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Deterministic scene plan validation — no AI, no guessing.
// Mirrors schemas/scene/*.v1.ts logic in plain JS.
app.post("/validate-plan", (req, res) => {
  const { scenePlan } = req.body;
  res.json(validateScenePlanPayload(scenePlan));
});

app.post("/snippets", async (req, res) => {
  const { key, description, code, tags, intent, scenePlan, modelExplanation, sceneHash: providedSceneHash } = req.body;

  if (!key || !description || !code) {
    return res.status(400).json({ error: "Missing required fields: key, description, code" });
  }

  try {
    const artifactScenePlan = scenePlan && typeof scenePlan === "object"
      ? scenePlan
      : {
          concept: "snippet_artifact",
          schemaVersion: "artifact_v1",
          parameters: {},
        };

    const sceneHash = providedSceneHash || computeSceneHash({
      scenePlan: artifactScenePlan,
      renderCode: code,
      schemaVersion: "artifact_v1",
    });

    await insertSnippet({ key, description, code, tags: tags || [], sceneHash });

    await insertRenderArtifact({
      sceneHash,
      scenePlan: artifactScenePlan,
      parentSceneHash: null,
      renderCode: code,
      intent: intent || `snippet:${key}`,
      modelExplanation: modelExplanation || null,
      schemaVersion: "artifact_v1",
      modelVersion: "none",
      promptVersion: "snippets_v1",
      updateClassification: null,
    });

    res.json({ success: true, key, sceneHash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Training data export (Vertex AI JSONL) ─────────────────────────────────

// Stats route defined before /:shape to prevent Express param capture.
app.get("/export/stats", async (req, res) => {
  try {
    const all = await getTrainingArtifacts();
    const good = all.filter((a) => a.quality_label === "good").length;
    const bad = all.filter((a) => a.quality_label === "bad").length;
    const unlabeled = all.filter((a) => !a.quality_label).length;
    const withExplanation = all.filter((a) => a.model_explanation).length;

    const byConcept = {};
    for (const a of all) {
      const c = a.scene_plan?.concept || "unknown";
      byConcept[c] = (byConcept[c] || 0) + 1;
    }

    res.json({
      total: all.length,
      byQuality: { good, bad, unlabeled },
      byConcept,
      eligibleForPlanner: all.filter((a) => a.intent && a.scene_plan).length,
      eligibleForArchitect: withExplanation,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/export/:shape", async (req, res) => {
  const { shape } = req.params;
  const validShapes = ["planner", "architect", "full_pipeline"];
  if (!validShapes.includes(shape)) {
    return res.status(400).json({ error: `Invalid shape. Must be one of: ${validShapes.join(", ")}` });
  }

  try {
    const requireExplanation = shape === "architect" || shape === "full_pipeline";
    const artifacts = await getTrainingArtifacts({
      qualityLabel: req.query.qualityLabel,
      concept: req.query.concept,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      excludeSnippets: req.query.excludeSnippets === "true",
      requireExplanation,
    });

    const includeSystemPrompt = req.query.includeSystemPrompt !== "false";
    const jsonl = formatArtifactsToJsonl(artifacts, shape, includeSystemPrompt);

    if (!jsonl) {
      return res.status(404).json({ error: "No artifacts matched the given filters" });
    }

    res.setHeader("Content-Type", "application/jsonl");
    res.setHeader("Content-Disposition", `attachment; filename="tuning_${shape}.jsonl"`);
    res.send(jsonl + "\n");
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
