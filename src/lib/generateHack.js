// FILE: src/lib/generateHack.js

import { stripJsonFences, detectLanguage, tryParseJson } from "./jsonUtils";

/**
 * Generate a hack by calling /api/hack (Edge Function).
 *
 * @param {string} prompt
 * @param {number} timeout   client-side timeout
 */
export async function generateHack(prompt = "", timeout = 20000) {
  const langHint = prompt ? detectLanguage(prompt) : "en";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch("/api/hack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        prompt: prompt || "random useful hack for anyone",
        langHint,
      }),
    });

    clearTimeout(timer);

    if (!response.ok) {
      let err = null;
      try {
        err = await response.json();
      } catch {}
      throw new Error(err?.error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    // Edge API returns: { title, description, ... } directly ✅
    if (data.title) {
      return normalizeHack(data);
    }

    // If somehow it returns {content: "...json..."}
    const raw = data.content || data;
    const cleaned = typeof raw === "string" ? stripJsonFences(raw) : raw;
    const parsed = typeof cleaned === "string" ? tryParseJson(cleaned) : cleaned;

    return normalizeHack(parsed);
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out");
    }
    console.error("generateHack error:", err);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- sanitize hack object ---------- */

function normalizeHack(h) {
  const obj = {
    title: h.title || "",
    description: h.description || "",
    category: h.category || "misc",
    difficulty: h.difficulty || "Easy",
    usefulness: clamp(useNumber(h.usefulness), 0, 100),
    bonus: h.bonus || "",
  };

  // cleanup
  obj.title = String(obj.title).trim();
  obj.description = String(obj.description).trim();
  obj.category = String(obj.category).trim();
  obj.bonus = String(obj.bonus).trim();

  // difficulty
  const d = obj.difficulty.toLowerCase();
  if (d.includes("adv")) obj.difficulty = "Advanced";
  else if (d.includes("med")) obj.difficulty = "Medium";
  else obj.difficulty = "Easy";

  return obj;
}

function useNumber(x) {
  if (typeof x === "number") return x;
  const m = String(x).match(/\d+/);
  return m ? Number(m[0]) : 50;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
