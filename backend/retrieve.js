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
