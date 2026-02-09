function normalizeKey(key) {
  return typeof key === "string" ? key.trim() : "";
}

export function chooseSnippetMock(options, intent) {
  // TEMP: deterministic rule-based chooser
  if (typeof intent === "string" && intent.includes("Flow")) {
    return "Turbulent_Flow_box";
  }
  return options[0]?.key;
}

export async function chooseSnippet(options, intent) {
  // Model-based selection is currently disabled.
  // const apiKey = process.env.GEMINI_API_KEY;
  // const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  // ... fetch/generateContent block intentionally commented out.

  if (!Array.isArray(options) || options.length === 0) {
    return "";
  }

  const intentText = typeof intent === "string" ? intent.toLowerCase() : "";
  const intentWords = intentText
    .split(/[^a-z0-9]+/i)
    .filter((word) => word.length > 2);

  let bestKey = options[0].key;
  let bestScore = 0;

  for (const option of options) {
    const optionText = `${option.key} ${option.description || ""}`.toLowerCase();
    let score = 0;

    for (const word of intentWords) {
      if (optionText.includes(word)) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestKey = option.key;
    }
  }

  if (bestScore > 0) {
    return bestKey;
  }

  return chooseSnippetMock(options, intent);
}
