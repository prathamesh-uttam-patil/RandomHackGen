// FILE: api/hack.js
export const config = {
  runtime: "edge",
  // regions: ["bom1"], // optional; comment out if your plan doesn't support pinned regions
};

const ENDPOINTS = [
  // Preferred: v1beta with -latest model
  (model, key) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
  // Fallback: v1 with non-latest name (some projects have this enabled)
  (model, key) =>
    `https://generativelanguage.googleapis.com/v1/models/${model.replace("-latest", "")}:generateContent?key=${key}`,
];

// Try these models in order
const MODEL_CANDIDATES = [
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-8b-latest",
  "gemini-1.5-flash", // in case v1 supports it in your project
];

export default async function handler(req) {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  if (req.method !== "POST") return cors(json({ error: "Method not allowed" }, 405));

  let body = {};
  try { body = await req.json(); } catch {}
  const { prompt = "random useful hack for anyone", langHint = "auto" } = body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return cors(json({ error: "Missing GEMINI_API_KEY on server" }, 500));

  const modelPrompt = buildPrompt(prompt, langHint);

  // 20s guard so Vercel doesn't kill us
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  try {
    let lastErrText = "";
    for (const model of MODEL_CANDIDATES) {
      for (const makeUrl of ENDPOINTS) {
        const url = makeUrl(model, apiKey);
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: modelPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
          }),
          signal: controller.signal,
        });

        if (resp.ok) {
          const data = await resp.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const parsed = JSON.parse(extractJSON(text));
          clearTimeout(timer);
          return cors(json(parsed, 200));
        } else {
          lastErrText = await resp.text();
          // If it's a 404 model error, we try the next candidate automatically
          if (resp.status !== 404) {
            clearTimeout(timer);
            return cors(json({ error: `Gemini error: ${resp.status} ${lastErrText}` }, resp.status));
          }
        }
      }
    }

    clearTimeout(timer);
    return cors(json({ error: `Gemini error: 404 ${lastErrText || "No compatible model found."}` }, 404));
  } catch (e) {
    clearTimeout(timer);
    const isAbort = e?.name === "AbortError";
    return cors(json({ error: isAbort ? "Upstream timeout" : (e?.message || "Server error") }, isAbort ? 504 : 500));
  }
}

function buildPrompt(userPrompt, langHint) {
  return `
You generate a single clever, unique hack.
Detect the user's input language; if Marathi then respond fully in Marathi; if English then respond in English. Mirror the dominant language. Do NOT translate unless asked.

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

function extractJSON(s) {
  const m = s.match(/```(?:json)?\n([\s\S]*?)```/i);
  return m ? m[1] : s;
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function cors(res) {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new Response(res.body, { status: res.status, headers: h });
}
