// FILE: src/lib/jsonUtils.js

/**
 * Remove markdown code fences like:
 * ```json
 * { ... }
 * ```
 */
export function stripJsonFences(text) {
  if (!text || typeof text !== "string") return text;

  // Triple backtick fences
  const triple = text.match(/```(?:json)?\n([\s\S]*?)```/i);
  if (triple && triple[1]) return triple[1].trim();

  // Single backticks
  const single = text.replace(/`([^`]*)`/g, "$1");
  return single.trim();
}

/**
 * Detect Marathi vs English.
 * Marathi uses Devanagari script (U+0900–U+097F)
 */
export function detectLanguage(text) {
  if (!text || typeof text !== "string") return "en";
  const devanagari = /[\u0900-\u097F]/;
  return devanagari.test(text) ? "mr" : "en";
}

/**
 * Extract the first valid {...} or [...] JSON substring from the text.
 */
export function extractFirstJson(text) {
  if (!text || typeof text !== "string") return null;

  const start = text.search(/[\{\[]/);
  if (start === -1) return null;

  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;

  for (let i = start; i < text.length; i++) {
    if (text[i] === open) depth++;
    if (text[i] === close) depth--;
    if (depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

/**
 * Try to parse JSON safely.
 */
export function tryParseJson(str) {
  if (typeof str !== "string") return str;

  try {
    return JSON.parse(str);
  } catch (err) {
    // fallback: attempt to extract JSON substring
    const extracted = extractFirstJson(str);
    if (extracted) {
      try {
        return JSON.parse(extracted);
      } catch {}
    }
    throw err;
  }
}
