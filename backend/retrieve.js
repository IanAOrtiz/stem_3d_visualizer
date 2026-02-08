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
    SELECT key, description, tags
    FROM code_snippets
    ORDER BY updated_at DESC;
    `
  );

  return res.rows;
}

export async function getSnippetByKey(key) {
  const res = await pool.query(
    `
    SELECT key, code
    FROM code_snippets
    WHERE key = $1
    LIMIT 1;
    `,
    [key]
  );

  return res.rows[0] || null;
}

export async function insertSnippet({ key, description, code, tags }) {
  await pool.query(
    `
    INSERT INTO code_snippets (key, description, code, tags)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (key) DO UPDATE SET
      description = EXCLUDED.description,
      code        = EXCLUDED.code,
      tags        = EXCLUDED.tags,
      updated_at  = NOW();
    `,
    [key, description, code, tags]
  );
}

export async function insertRenderArtifact({
  sceneHash,
  snippetKey,
  intent,
  codeSnapshot,
}) {
  const query = `
    INSERT INTO render_artifacts (
      visualization_hash,
      snippet_key,
      intent,
      code_snapshot,
      schema_version,
      prompt_version,
      model_version
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (visualization_hash) DO NOTHING;
  `;

  await pool.query(query, [
    sceneHash,
    snippetKey,
    intent,
    codeSnapshot,
    "artifact_v1",
    "chooseSnippet_v1",
    "none",
  ]);
}

export function computeSceneHash({
  snippetKey,
  codeSnapshot,
  schemaVersion,
}) {
  const canonical = JSON.stringify({
    snippetKey,
    codeSnapshot,
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
    WHERE visualization_hash = $3;
    `,
    [qualityLabel, qualityReason || null, sceneHash]
  );
}
