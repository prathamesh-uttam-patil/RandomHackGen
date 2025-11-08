/**
 * jsonUtils - small helpers for cleaning/parsing model JSON outputs
 *
 * Functions:
 *  - stripJsonFences(text)     : removes ```json``` or ``` fenced code blocks and returns inner text
 *  - detectLanguage(text)      : basic language detector that returns 'mr' for Marathi (Devanagari) or 'en' otherwise
 *  - extractFirstJson(text)    : tries to find the first JSON object/array substring in the given text
 *  - tryParseJson(text)        : safe JSON.parse that returns object or throws
 */

/**
 * Remove Markdown code fences (```json ... ``` or ``` ... ```) or single backtick blocks.
 * Returns a trimmed string.
 */
export function stripJsonFences(text) {
  if (!text || typeof text !== "string") return text;
  // Remove triple backtick fences with optional "json"
  const fenceMatch = text.match(/```(?:json)?\n([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }
  // Remove single-line code fences `...`
  const single = text.replace(/`([^`]*)`/g, "$1");
  return single.trim();
}

/**
 * Very small language detector:
 * - If the string contains Devanagari characters (U+0900–U+097F), assume Marathi ('mr')
 * - Otherwise default to English ('en')
 *
 * This is intentionally simple and works well for the Marathi vs English use-case.
 */
export function detectLanguage(text) {
  if (!text || typeof text !== "string") return "en";
  // Devanagari unicode block: \u0900 - \u097F
  const devanagari = /[\u0900-\u097F]/;
  if (devanagari.test(text)) return "mr";
  return "en";
}

/**
 * Attempt to find the first JSON object or array inside an arbitrary text blob.
 * Returns the substring (still as string) or null.
 */
export function extractFirstJson(text) {
  if (!text || typeof text !== "string") return null;

  // Try to find a JSON object {...} or array [...] by scanning brackets.
  // We'll look for the first '{' or '[' and attempt to greedily match until the corresponding close.
  const startIdx = text.search(/[\{\[]/);
  if (startIdx === -1) return null;

  const openChar = text[startIdx];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (ch === openChar) depth++;
    else if (ch === closeChar) depth--;

    if (depth === 0) {
      const candidate = text.slice(startIdx, i + 1);
      return candidate;
    }
  }
  return null;
}

/**
 * Try to parse JSON from a string robustly.
 * - First attempts direct JSON.parse
 * - If that fails, attempts to extract first JSON substring and parse that
 * - Throws the original error if parsing ultimately fails
 */
export function tryParseJson(str) {
  if (typeof str !== "string") {
    // If it's already an object, return as-is
    return str;
  }

  try {
    return JSON.parse(str);
  } catch (err) {
    const extracted = extractFirstJson(str);
    if (extracted) {
      try {
        return JSON.parse(extracted);
      } catch (err2) {
        // fall through to throw original
      }
    }
    throw err;
  }
}
