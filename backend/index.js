import 'dotenv/config';

import cors from "cors";
import express from "express";
import { getSnippetByKey, getSnippetsByIntent, insertSnippet } from "./retrieve.js";
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

app.post("/snippets", async (req, res) => {
  const { key, description, code, tags } = req.body;

  if (!key || !description || !code) {
    return res.status(400).json({ error: "Missing required fields: key, description, code" });
  }

  try {
    await insertSnippet({ key, description, code, tags: tags || [] });
    res.json({ success: true, key });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
