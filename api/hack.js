// FILE: api/hack.js
/**
 * Edge function for Random Hack Generator
 * - Forces JSON output via generationConfig.responseMimeType = "application/json"
 * - Robust parsing & diagnostics
 * - Times out upstream after 20s to avoid Vercel kills
 * - Sends helpful headers: X-Gemini-Base, X-Gemini-Model
 *
 * Prereq: Set server-side env var on Vercel → GEMINI_API_KEY
 */

export const config = { runtime: "edge" };

export default async function handler(req) {
  // CORS / Preflight
  if (req.method === "OPTIONS") {
    return withCORS(new Response(null, { status: 204 }));
  }
  if (req.method !== "POST") {
    return withCORS(json({ error: "Method not allowed" }, 405));
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return withCORS(json({ error: "Missing GEMINI_API_KEY on server" }, 500));

  let body = {};
  try { body = await req.json(); } catch {}
  const { prompt = "random useful hack for anyone", langHint = "auto" } = body;

  // Short, strict instruction
  const systemInstruction = [
    "You generate a single clever, unique, practical hack.",
    "Detect the user's input language; if Marathi then respond fully in Marathi; if English then in English.",
    "Mirror the dominant language. Do NOT translate unless asked.",
    "Return ONLY strict JSON, no markdown, no extra text."
  ].join(" ");

  // Force JSON response from Gemini
  const generationConfig = {
    temperature: 0.7,
    maxOutputTokens: 400,
    responseMimeType: "application/json"
  };

  // Prefer models that are actually available per your headers:
  // You already saw: v1beta/models/gemini-flash-latest ⇒ modelVersion: gemini-2.5-flash-preview-09-2025
  const BASES = ["v1beta", "v1"];
  const MODELS = [
    "models/gemini-flash-latest",          // maps to 2.5 flash preview
    "models/gemini-1.5-flash-latest",
    "models/gemini-1.5-flash-8b-latest"
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  try {
    let lastErr = null;

    for (const base of BASES) {
      for (const model of MODELS) {
        const url = `https://generativelanguage.googleapis.com/${base}/${model}:generateContent?key=${key}`;
        const payload = {
          contents: [
            { role: "user", parts: [{ text: buildUserPrompt(prompt, langHint) }] }
          ],
          systemInstruction: { role: "system", parts: [{ text: systemInstruction }] },
          generationConfig
        };

        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        const xHeaders = { "X-Gemini-Base": base, "X-Gemini-Model": model };

        if (!resp.ok) {
          lastErr = await resp.text().catch(() => "");
          // If it's not a 404 model mismatch, return immediately
          if (resp.status !== 404) {
            clearTimeout(timer);
            return withCORS(json({ error: `Gemini error: ${resp.status} ${lastErr}` }, resp.status), xHeaders);
          }
          // else try next model/base
          continue;
        }

        // Expect JSON because we forced responseMimeType
        const dataText = await resp.text();
        // If the upstream already returned JSON, forward it as-is
        try {
          const parsed = JSON.parse(dataText);

          // Common shapes:
          // A) Direct JSON object (ideal, because we forced JSON)
          // B) Wrapped in candidates[0].content.parts[0].text (stringified JSON)
          // Normalize both cases:

          // Case A: Already an object with fields
          if (isHackShape(parsed)) {
            clearTimeout(timer);
            return withCORS(json(parsed, 200), xHeaders);
          }

          // Case B: Safety: some responses still come as candidates/parts
          const text =
            parsed?.candidates?.[0]?.content?.parts?.[0]?.text ??
            parsed?.output_text ?? // future-proof
            "";

          if (typeof text === "string" && text.trim()) {
            const inner = safeJsonExtract(text);
            if (inner) {
              clearTimeout(timer);
              return withCORS(json(inner, 200), xHeaders);
            }
          }

          // If still nothing usable, return diagnostics
          clearTimeout(timer);
          return withCORS(
            json(
              {
                error: "Model returned no usable JSON",
                raw: parsed ?? dataText
              },
              200
            ),
            xHeaders
          );
        } catch (e) {
          // Not valid JSON string (unexpected), return diagnostics
          clearTimeout(timer);
          return withCORS(
            json(
              {
                error: "Upstream did not return valid JSON",
                raw: dataText
              },
              200
            ),
            xHeaders
          );
        }
      }
    }

    clearTimeout(timer);
    return withCORS(json({ error: `Gemini error: 404 ${lastErr || "No compatible model found."}` }, 404));
  } catch (e) {
    clearTimeout(timer);
    const isAbort = e?.name === "AbortError";
    return withCORS(json({ error: isAbort ? "Upstream timeout" : (e?.message || "Server error") }, isAbort ? 504 : 500));
  }
}

/* ---------------- helpers ---------------- */

function buildUserPrompt(userPrompt, langHint) {
  return `
Output ONLY strict JSON with keys exactly:
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

// Heuristic: does the object look like our hack?
function isHackShape(o) {
  if (!o || typeof o !== "object") return false;
  const keys = ["title", "description", "category", "difficulty", "usefulness", "bonus"];
  return keys.every(k => Object.prototype.hasOwnProperty.call(o, k));
}

// Try to extract JSON from a string (if model returned JSON as text)
function safeJsonExtract(text) {
  // Remove ```json ... ``` fences
  const fenced = text.match(/```(?:json)?\n([\s\S]*?)```/i);
  const clean = (fenced ? fenced[1] : text).trim();

  // Attempt direct parse
  try {
    const parsed = JSON.parse(clean);
    if (isHackShape(parsed)) return parsed;
  } catch {}

  // Try to find first {...} block
  const start = clean.search(/[\{\[]/);
  if (start !== -1) {
    const open = clean[start];
    const close = open === "{" ? "}" : "]";
    let depth = 0;
    for (let i = start; i < clean.length; i++) {
      const ch = clean[i];
      if (ch === open) depth++;
      else if (ch === close) depth--;
      if (depth === 0) {
        const slice = clean.slice(start, i + 1);
        try {
          const parsed = JSON.parse(slice);
          if (isHackShape(parsed)) return parsed;
        } catch {}
        break;
      }
    }
  }
  return null;
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function withCORS(res, extraHeaders = {}) {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  for (const [k, v] of Object.entries(extraHeaders)) h.set(k, v);
  return new Response(res.body, { status: res.status, headers: h });
}
