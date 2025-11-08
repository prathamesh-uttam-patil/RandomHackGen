// FILE: api/hack.js
/**
 * Random Hack Generator — Gemini Edge API
 *
 * Fixes:
 * - Forces JSON via responseMimeType
 * - Uses concise instructions to reduce prompt tokens
 * - Starts with medium maxOutputTokens, auto-retries with higher cap if finishReason=MAX_TOKENS or no text
 * - Robust parsing + diagnostics
 */

export const config = { runtime: "edge" };

export default async function handler(req) {
  // CORS / Preflight
  if (req.method === "OPTIONS") return withCORS(new Response(null, { status: 204 }));
  if (req.method !== "POST") return withCORS(json({ error: "Method not allowed" }, 405));

  const key = process.env.GEMINI_API_KEY;
  if (!key) return withCORS(json({ error: "Missing GEMINI_API_KEY on server" }, 500));

  let body = {};
  try { body = await req.json(); } catch {}
  const { prompt = "random useful hack for anyone", langHint = "auto" } = body;

  // Extremely concise instructions (short = fewer prompt tokens)
  const systemInstruction = "Reply ONLY JSON for one practical hack. If input Marathi, reply Marathi; else English.";
  const userInstruction = buildUserPrompt(prompt, langHint);

  // Prefer the model you actually hit in headers earlier:
  //   v1beta/models/gemini-flash-latest  (maps to 2.5 flash preview)
  const BASES = ["v1beta", "v1"];
  const MODELS = ["models/gemini-flash-latest", "models/gemini-1.5-flash-latest", "models/gemini-1.5-flash-8b-latest"];

  // Two attempts: first moderate token cap, then higher if MAX_TOKENS or empty output
  const ATTEMPTS = [
    { maxOutputTokens: 512, temperature: 0.4 },   // concise, stable
    { maxOutputTokens: 1024, temperature: 0.3 },  // give extra room if first hit cap
  ];

  const controller = new AbortController();
  const kill = setTimeout(() => controller.abort(), 20_000);

  try {
    let lastDiag = null;

    for (const base of BASES) {
      for (const model of MODELS) {
        for (const attempt of ATTEMPTS) {
          const url = `https://generativelanguage.googleapis.com/${base}/${model}:generateContent?key=${key}`;

          const payload = {
            contents: [{ role: "user", parts: [{ text: userInstruction }]}],
            systemInstruction: { role: "system", parts: [{ text: systemInstruction }] },
            generationConfig: {
              temperature: attempt.temperature,
              maxOutputTokens: attempt.maxOutputTokens,
              responseMimeType: "application/json",
              // If your account supports response schema, uncomment the next block to enforce structure:
              // responseSchema: {
              //   type: "object",
              //   properties: {
              //     title: { type: "string" },
              //     description: { type: "string" },
              //     category: { type: "string" },
              //     difficulty: { type: "string", enum: ["Easy","Medium","Advanced"] },
              //     usefulness: { type: "integer" },
              //     bonus: { type: "string" }
              //   },
              //   required: ["title","description","category","difficulty","usefulness","bonus"]
              // }
            }
          };

          const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal
          });

          const hdrs = { "X-Gemini-Base": base, "X-Gemini-Model": model, "X-Tokens-Target": String(attempt.maxOutputTokens) };

          if (!resp.ok) {
            lastDiag = { status: resp.status, text: await safeText(resp) };
            // Return non-404 errors immediately; try next model for 404 only.
            if (resp.status !== 404) {
              clearTimeout(kill);
              return withCORS(json({ error: `Gemini error: ${resp.status} ${lastDiag.text}` }, resp.status), hdrs);
            }
            continue; // try next model/base
          }

          // We forced JSON mime type, but upstream may still return wrapper JSON.
          const dataText = await safeText(resp);

          // Try direct parse first
          const parsed = safeJson(dataText);

          // If it's already the hack object, return it
          if (isHackShape(parsed)) {
            clearTimeout(kill);
            return withCORS(json(parsed, 200), hdrs);
          }

          // If it's a wrapper, try to pull the string text (some models embed JSON string there)
          const candidateText =
            parsed?.candidates?.[0]?.content?.parts?.[0]?.text ??
            parsed?.output_text ??
            "";

          // Extract JSON from candidate text if present
          if (typeof candidateText === "string" && candidateText.trim()) {
            const inner = extractJsonBlock(candidateText);
            if (inner && isHackShape(inner)) {
              clearTimeout(kill);
              return withCORS(json(inner, 200), hdrs);
            }
          }

          // If finishReason suggests MAX_TOKENS or no text, store diag and retry with higher cap
          const finish = parsed?.candidates?.[0]?.finishReason || null;
          const usage = parsed?.usageMetadata || null;
          lastDiag = { finishReason: finish, usage };
          if (finish === "MAX_TOKENS" || !candidateText) {
            // Go to next attempt (higher tokens) or next model
            continue;
          }

          // Otherwise, return diagnostics so the client can show a helpful message
          clearTimeout(kill);
          return withCORS(json({ error: "Model returned no usable JSON", raw: parsed }, 200), hdrs);
        }
      }
    }

    clearTimeout(kill);
    return withCORS(json({ error: "No compatible model / no usable output", diag: lastDiag }, 502));
  } catch (e) {
    clearTimeout(kill);
    const isAbort = e?.name === "AbortError";
    return withCORS(json({ error: isAbort ? "Upstream timeout" : (e?.message || "Server error") }, isAbort ? 504 : 500));
  }
}

/* ---------------- helpers ---------------- */

function buildUserPrompt(userPrompt, langHint) {
  // Keep this super short to reduce prompt tokens
  return `Return ONLY JSON with keys:
{"title":"","description":"","category":"","difficulty":"Easy|Medium|Advanced","usefulness":0,"bonus":""}
User prompt: ${userPrompt}
Lang hint: ${langHint}`;
}

function isHackShape(o) {
  if (!o || typeof o !== "object") return false;
  const keys = ["title", "description", "category", "difficulty", "usefulness", "bonus"];
  return keys.every(k => Object.prototype.hasOwnProperty.call(o, k));
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return null; }
}

async function safeText(resp) {
  try { return await resp.text(); } catch { return ""; }
}

// Extract a JSON object/array from a string (handles ```json fences too)
function extractJsonBlock(s) {
  if (!s || typeof s !== "string") return null;
  const fenced = s.match(/```(?:json)?\n([\s\S]*?)```/i);
  const t = (fenced ? fenced[1] : s).trim();

  // Try direct parse
  const direct = safeJson(t);
  if (direct) return direct;

  // Find first {...} or [...] block
  const start = t.search(/[\{\[]/);
  if (start === -1) return null;
  const open = t[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < t.length; i++) {
    const ch = t[i];
    if (ch === open) depth++;
    else if (ch === close) depth--;
    if (depth === 0) {
      const slice = t.slice(start, i + 1);
      const obj = safeJson(slice);
      if (obj) return obj;
      break;
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

function withCORS(res, extra = {}) {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return new Response(res.body, { status: res.status, headers: h });
}
