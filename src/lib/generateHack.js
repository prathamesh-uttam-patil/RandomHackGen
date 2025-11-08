// FILE: src/lib/generateHack.js

import { stripJsonFences, detectLanguage, tryParseJson } from "./jsonUtils";

export async function generateHack(prompt = "", timeout = 20000) {
  const langHint = prompt ? detectLanguage(prompt) : "en";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch("/api/hack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        prompt: prompt || "random useful hack for anyone",
        langHint,
      }),
    });

    clearTimeout(timer);

    if (!res.ok) {
      let err = null;
      try {
        err = await res.json();
      } catch {}
      throw new Error(err?.error || `HTTP ${res.status}`);
    }

    const data = await res.json();

    // If API already returns JSON → direct
    if (data.title) return normalizeHack(data);

    // else parse "content"
    const raw = data.content || data;
    const cleaned = typeof raw === "string" ? stripJsonFences(raw) : raw;

    const parsed =
      typeof cleaned === "string" ? tryParseJson(cleaned) : cleaned;

    return normalizeHack(parsed);
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Request timed out");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeHack(h) {
  const obj = {
    title: (h.title || "").trim(),
    description: (h.description || "").trim(),
    category: (h.category || "misc").trim(),
    difficulty: (h.difficulty || "Easy").trim(),
    usefulness: clamp(toNum(h.usefulness), 0, 100),
    bonus: (h.bonus || "").trim(),
  };

  const d = obj.difficulty.toLowerCase();
  if (d.includes("adv")) obj.difficulty = "Advanced";
  else if (d.includes("med")) obj.difficulty = "Medium";
  else obj.difficulty = "Easy";

  return obj;
}

function toNum(n) {
  if (typeof n === "number") return n;
  const m = String(n).match(/\d+/);
  return m ? Number(m[0]) : 50;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
