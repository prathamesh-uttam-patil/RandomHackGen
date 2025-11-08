/**
 * api/hack.js
 *
 * Edge serverless function that:
 *  - Discovers a usable Gemini model for generateContent (v1beta -> v1)
 *  - Calls the model with a guarded timeout
 *  - Parses the model output into JSON (with robust fallback and diagnostics)
 *  - Returns parsed hack JSON or a diagnostic { error, raw } when parsing fails
 *
 * Requirements:
 *  - Set a server-side environment variable `GEMINI_API_KEY` in Vercel (Project Settings → Environment Variables)
 *
 * Notes:
 *  - This file is intended to run as an Edge function (Vercel "edge" runtime).
 *  - It returns CORS-friendly responses and includes helpful headers (X-Gemini-Model / X-Gemini-Base).
 */

export const config = {
  runtime: "edge",
  // regions: ["bom1"], // optional: enable if your plan supports region pinning and you want a specific POP
};

export default async function handler(req) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return cors(new Response(null, { status: 204 }));
  }

  if (req.method !== "POST") {
    return cors(json({ error: "Method not allowed" }, 405));
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return cors(json({ error: "Missing GEMINI_API_KEY on server" }, 500));
  }

  // Read body safely
  let body = {};
  try {
    body = await req.json();
  } catch {
    // allow empty body
  }
  const { prompt = "random useful hack for anyone", langHint = "auto" } = body;

  // Build the short prompt we send to the model
  const modelPrompt = buildPrompt(prompt, langHint);

  // Abort controller to guard against long upstream requests
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000); // 20s

  try {
    // Discover a usable model (that supports generateContent) for this API key
    const pick = await discoverUsableModel(apiKey, controller.signal);
    if (!pick) {
      clearTimeout(timer);
      return cors(json({ error: "No compatible Gemini model found for generateContent." }, 404));
    }

    const { base, name } = pick; // e.g. base = "v1beta", name = "models/gemini-flash-latest"
    const url = `https://generativelanguage.googleapis.com/${base}/${name}:generateContent?key=${apiKey}`;

    // Call the model
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: modelPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    const xHeaders = { "X-Gemini-Base": base, "X-Gemini-Model": name };

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return cors(json({ error: `Gemini error: ${resp.status} ${errText}` }, resp.status), xHeaders);
    }

    const data = await resp.json().catch(() => null);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Try to parse strict JSON. If parsing fails, return diagnostic (raw output) so frontend can show it.
    try {
      const parsedText = extractJSON(text);
      const parsed = parsedText ? JSON.parse(parsedText) : JSON.parse(text);
      return cors(json(parsed, 200), xHeaders);
    } catch (parseErr) {
      // Return raw text for debugging and show helpful header
      console.error("Model parse error:", parseErr, "raw:", text);
      return cors(
        json(
          {
            error: "Model output could not be parsed as JSON",
            raw: text || null,
          },
          200
        ),
        xHeaders
      );
    }
  } catch (e) {
    clearTimeout(timer);
    const isAbort = e?.name === "AbortError";
    return cors(json({ error: isAbort ? "Upstream timeout" : (e?.message || "Server error") }, isAbort ? 504 : 500));
  }
}

/* ----------------- Helper functions ----------------- */

/**
 * Discover a usable model that supports generateContent.
 * Tries v1beta then v1, and returns the best-scored model available to the API key.
 *
 * Returns: { base: "v1beta"|"v1", name: "models/..." } or null
 */
async function discoverUsableModel(apiKey, signal) {
  const bases = ["v1beta", "v1"];
  for (const base of bases) {
    const url = `https://generativelanguage.googleapis.com/${base}/models?key=${apiKey}`;
    let res;
    try {
      res = await fetch(url, { signal });
    } catch {
      continue;
    }
    if (!res.ok) continue;
    const j = await res.json().catch(() => null);
    const models = Array.isArray(j?.models) ? j.models : [];

    // Filter models that support generateContent
    const usable = models.filter(
      (m) => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent")
    );

    if (!usable.length) continue;

    // Score & sort
    usable.sort((a, b) => scoreModel(b) - scoreModel(a));
    const best = usable[0];
    if (best?.name) return { base, name: best.name };
  }
  return null;

  function scoreModel(m) {
    const n = String(m?.name || "").toLowerCase();
    let s = 0;
    if (n.includes("flash")) s += 5;
    if (n.includes("1.5")) s += 3;
    if (n.includes("latest")) s += 2;
    if (n.includes("8b")) s += 1;
    return s;
  }
}

/**
 * Build the short model prompt. Keep it concise to avoid large token usage.
 */
function buildPrompt(userPrompt, langHint) {
  return `
You generate a single clever, unique hack.
Detect the user's input language; if Marathi then respond fully in Marathi; if English then in English. Mirror the dominant language. Do NOT translate unless asked.

Return ONLY strict JSON (no markdown, no commentary):
{
  "title": "",
  "description": "",
  "category": "",
  "difficulty": "Easy | Medium | Advanced",
  "usefulness": 0,
  "bonus": ""
}

User prompt: ${userPrompt}
Language hint: ${langHint}
`.trim();
}

/**
 * Try to extract JSON content between code fences or the first {...} / [...] in the text.
 * Returns the JSON substring or null.
 */
function extractJSON(text) {
  if (!text || typeof text !== "string") return null;

  // Try triple-backtick fenced JSON first
  const fence = text.match(/```(?:json)?\n([\s\S]*?)```/i);
  if (fence && fence[1]) return fence[1].trim();

  // Otherwise attempt to find the first {...} or [...] block
  const start = text.search(/[\{\[]/);
  if (start === -1) return null;
  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === open) depth++;
    else if (ch === close) depth--;
    if (depth === 0) {
      return text.slice(start, i + 1).trim();
    }
  }
  return null;
}

/* Small helpers for responses */

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function cors(res, extra = {}) {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return new Response(res.body, { status: res.status, headers: h });
}
