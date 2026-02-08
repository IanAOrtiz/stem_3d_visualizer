import 'dotenv/config';

import cors from "cors";
import express from "express";
import { getSnippetByKey, getSnippetsByIntent, getSnippetCatalog, insertSnippet, insertRenderArtifact, computeSceneHash, updateArtifactQuality } from "./retrieve.js";
import { chooseSnippet } from "./chooseSnippet.js";

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

app.post("/artifacts/validate", async (req, res) => {
  const { key, description, code, tags, intent } = req.body;

  if (!key || !code) {
    return res.status(400).json({ error: "Missing required fields: key, code" });
  }

  try {
    const sceneHash = computeSceneHash({
      snippetKey: key,
      codeSnapshot: code,
      schemaVersion: "artifact_v1",
    });

    await insertRenderArtifact({
      sceneHash,
      snippetKey: key,
      intent: intent || null,
      codeSnapshot: code,
    });

    res.json({ success: true, sceneHash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/artifacts/feedback", async (req, res) => {
  const { key, description, code, tags, intent, feedback, reason } = req.body;

  if (!key || !code || !feedback) {
    return res.status(400).json({ error: "Missing required fields: key, code, feedback" });
  }

  try {
    const sceneHash = computeSceneHash({
      snippetKey: key,
      codeSnapshot: code,
      schemaVersion: "artifact_v1",
    });

    if (feedback === 'good') {
      await insertSnippet({ key, description: description || '', code, tags: tags || [] });
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
// Mirrors harmonic_oscillator.v1 schema logic in plain JS.
app.post("/validate-plan", (req, res) => {
  const { scenePlan } = req.body;
  const errors = [];

  if (!scenePlan || typeof scenePlan !== "object") {
    return res.json({ valid: false, errors: ["scenePlan must be a non-null object."] });
  }
  if (scenePlan.concept !== "harmonic_oscillator") {
    errors.push(`Unknown concept: "${scenePlan.concept}". Only "harmonic_oscillator" is registered.`);
  }
  if (scenePlan.schemaVersion !== "v1") {
    errors.push(`Unknown schemaVersion: "${scenePlan.schemaVersion}". Only "v1" is registered.`);
  }
  if (errors.length > 0) {
    return res.json({ valid: false, errors });
  }

  // Normalize parameters.
  const PARAM_MAP = { amplitude: "amplitude", A: "amplitude", frequency: "frequency", f: "frequency", phase: "phase" };
  const raw = scenePlan.parameters || {};
  const canonical = {};
  const seen = new Set();

  for (const key of Object.keys(raw)) {
    const target = PARAM_MAP[key];
    if (!target) {
      return res.json({ valid: false, errors: [`Unknown parameter: "${key}". Allowed: ${Object.keys(PARAM_MAP).join(", ")}`] });
    }
    if (seen.has(target)) {
      return res.json({ valid: false, errors: [`Duplicate mapping for "${target}" via key "${key}".`] });
    }
    seen.add(target);
    canonical[target] = raw[key];
  }

  if (canonical.amplitude === undefined) errors.push('Missing required parameter: "amplitude" (or alias "A").');
  if (canonical.frequency === undefined) errors.push('Missing required parameter: "frequency" (or alias "f").');
  if (errors.length > 0) return res.json({ valid: false, errors });

  if (canonical.phase === undefined) canonical.phase = 0;

  // Structural check.
  for (const field of ["amplitude", "frequency", "phase"]) {
    if (typeof canonical[field] !== "number" || Number.isNaN(canonical[field])) {
      errors.push(`${field} must be a finite number.`);
    }
  }
  if (errors.length > 0) return res.json({ valid: false, errors });

  // Contracts.
  if (canonical.amplitude <= 0) errors.push(`amplitude must be > 0, got ${canonical.amplitude}.`);
  if (canonical.frequency <= 0) errors.push(`frequency must be > 0, got ${canonical.frequency}.`);
  if (errors.length > 0) return res.json({ valid: false, errors });

  res.json({
    valid: true,
    errors: [],
    canonicalScenePlan: {
      concept: scenePlan.concept,
      schemaVersion: scenePlan.schemaVersion,
      parameters: canonical,
    },
  });
});

app.post("/snippets", async (req, res) => {
  const { key, description, code, tags, intent } = req.body;

  if (!key || !description || !code) {
    return res.status(400).json({ error: "Missing required fields: key, description, code" });
  }

  try {
    await insertSnippet({ key, description, code, tags: tags || [] });

    const sceneHash = computeSceneHash({
      snippetKey: key,
      codeSnapshot: code,
      schemaVersion: "artifact_v1",
    });

    await insertRenderArtifact({
      sceneHash,
      snippetKey: key,
      intent: intent || null,
      codeSnapshot: code,
    });

    res.json({ success: true, key, sceneHash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
