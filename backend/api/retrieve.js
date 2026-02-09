import crypto from "crypto";
import { pool } from "./db.js";

export async function getSnippetsByIntent(intent) {
  const res = await pool.query(
    `
    SELECT key, description, tags
    FROM code_snippets
    WHERE
      to_tsvector('english', description) @@ plainto_tsquery('english', $1)
      OR
      tags && string_to_array($1, ' ')
    ORDER BY id
    LIMIT 5;
    `,
    [intent]
  );

  return res.rows;
}

export async function getSnippetCatalog() {
  const res = await pool.query(
    `
    SELECT key, description, tags, scene_hash
    FROM code_snippets
    ORDER BY updated_at DESC;
    `
  );

  return res.rows;
}

export async function getSnippetByKey(key) {
  const res = await pool.query(
    `
    SELECT key, code, scene_hash
    FROM code_snippets
    WHERE key = $1
    LIMIT 1;
    `,
    [key]
  );

  return res.rows[0] || null;
}

export async function insertSnippet({ key, description, code, tags, sceneHash }) {
  await pool.query(
    `
    INSERT INTO code_snippets (key, description, code, tags, scene_hash)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (key) DO UPDATE SET
      description = EXCLUDED.description,
      code        = EXCLUDED.code,
      tags        = EXCLUDED.tags,
      scene_hash  = COALESCE(EXCLUDED.scene_hash, code_snippets.scene_hash),
      updated_at  = NOW();
    `,
    [key, description, code, tags, sceneHash || null]
  );
}

export async function getArtifactBySceneHash(sceneHash) {
  const res = await pool.query(
    `
    SELECT
      scene_hash,
      scene_plan,
      parent_scene_hash,
      render_code,
      intent,
      model_explanation,
      quality_label,
      quality_reason,
      schema_version,
      model_version,
      prompt_version,
      update_classification
    FROM render_artifacts
    WHERE scene_hash = $1
    LIMIT 1;
    `,
    [sceneHash]
  );

  return res.rows[0] || null;
}

export async function insertRenderArtifact({
  sceneHash,
  scenePlan,
  parentSceneHash,
  renderCode,
  intent,
  modelExplanation,
  schemaVersion,
  modelVersion,
  promptVersion,
  updateClassification,
}) {
  const query = `
    INSERT INTO render_artifacts (
      scene_hash,
      scene_plan,
      parent_scene_hash,
      render_code,
      intent,
      model_explanation,
      schema_version,
      model_version,
      prompt_version,
      update_classification
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (scene_hash) DO NOTHING;
  `;

  await pool.query(query, [
    sceneHash,
    scenePlan,
    parentSceneHash || null,
    renderCode,
    intent,
    modelExplanation || null,
    schemaVersion,
    modelVersion,
    promptVersion,
    updateClassification || null,
  ]);
}

export function computeSceneHash({
  scenePlan,
  renderCode,
  schemaVersion,
}) {
  const canonical = JSON.stringify({
    scenePlan,
    renderCode,
    schemaVersion,
  });

  return crypto
    .createHash("sha256")
    .update(canonical)
    .digest("hex");
}

export async function updateArtifactQuality({ sceneHash, qualityLabel, qualityReason }) {
  await pool.query(
    `
    UPDATE render_artifacts
    SET quality_label = $1,
        quality_reason = $2
    WHERE scene_hash = $3;
    `,
    [qualityLabel, qualityReason || null, sceneHash]
  );
}

/**
 * Query render_artifacts for training data export.
 * Returns ALL artifacts by default — good, bad, and unlabeled — so
 * fine-tuning datasets include quality metadata for the model to learn from.
 */
export async function getTrainingArtifacts({
  qualityLabel,
  concept,
  schemaVersion,
  dateFrom,
  dateTo,
  excludeSnippets = false,
  requireExplanation = false,
} = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;

  if (qualityLabel !== undefined) {
    if (qualityLabel === null) {
      conditions.push(`quality_label IS NULL`);
    } else {
      conditions.push(`quality_label = $${idx++}`);
      params.push(qualityLabel);
    }
  }

  if (concept) {
    conditions.push(`scene_plan->>'concept' = $${idx++}`);
    params.push(concept);
  }

  if (schemaVersion) {
    conditions.push(`schema_version = $${idx++}`);
    params.push(schemaVersion);
  }

  if (dateFrom) {
    conditions.push(`created_at >= $${idx++}`);
    params.push(dateFrom);
  }

  if (dateTo) {
    conditions.push(`created_at <= $${idx++}`);
    params.push(dateTo);
  }

  if (excludeSnippets) {
    conditions.push(`prompt_version != 'snippets_v1'`);
  }

  if (requireExplanation) {
    conditions.push(`model_explanation IS NOT NULL`);
  }

  const where = conditions.length > 0
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const res = await pool.query(
    `
    SELECT
      scene_hash,
      scene_plan,
      parent_scene_hash,
      render_code,
      intent,
      model_explanation,
      quality_label,
      quality_reason,
      schema_version,
      model_version,
      prompt_version,
      update_classification,
      created_at
    FROM render_artifacts
    ${where}
    ORDER BY created_at ASC;
    `,
    params
  );

  return res.rows;
}
