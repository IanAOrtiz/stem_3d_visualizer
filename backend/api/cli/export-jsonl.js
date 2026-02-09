#!/usr/bin/env node
/**
 * CLI: Export render_artifacts → Vertex AI JSONL for Gemini fine-tuning.
 *
 * Usage:
 *   node cli/export-jsonl.js --shape planner [options]
 *
 * Options:
 *   --shape <planner|architect|full_pipeline>  (required)
 *   --concept <name>          Filter by scene concept
 *   --quality-label <label>   Filter by quality label (good, bad)
 *   --date-from <ISO>         Only artifacts created after this date
 *   --date-to <ISO>           Only artifacts created before this date
 *   --exclude-snippets        Skip snippet-origin artifacts
 *   --no-system-prompt        Omit systemInstruction from JSONL lines
 *   --dry-run                 Print count + sample line, don't write file
 */

import 'dotenv/config';
import { parseArgs } from "node:util";
import { exportTrainingData } from "../exportTrainingData.js";

const { values } = parseArgs({
  options: {
    shape: { type: "string" },
    concept: { type: "string" },
    "quality-label": { type: "string" },
    "date-from": { type: "string" },
    "date-to": { type: "string" },
    "exclude-snippets": { type: "boolean", default: false },
    "no-system-prompt": { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
  },
  strict: true,
});

if (!values.shape) {
  console.error("Error: --shape is required (planner | architect | full_pipeline)");
  process.exit(1);
}

try {
  const result = await exportTrainingData({
    shape: values.shape,
    concept: values.concept,
    qualityLabel: values["quality-label"],
    dateFrom: values["date-from"],
    dateTo: values["date-to"],
    excludeSnippets: values["exclude-snippets"],
    includeSystemPrompt: !values["no-system-prompt"],
    dryRun: values["dry-run"],
  });

  if (values["dry-run"]) {
    console.log(`[DRY RUN] Shape: ${values.shape}`);
    console.log(`[DRY RUN] Eligible artifacts: ${result.count}`);
    if (result.sample) {
      console.log(`[DRY RUN] Sample line:\n${JSON.stringify(result.sample, null, 2)}`);
    }
  } else if (result.count === 0) {
    console.log("No artifacts matched the given filters. Nothing written.");
  } else {
    console.log(`Exported ${result.count} examples → ${result.path}`);
  }
} catch (err) {
  console.error("Export failed:", err.message);
  process.exit(1);
}
