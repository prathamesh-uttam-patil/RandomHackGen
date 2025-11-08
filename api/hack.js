// FILE: api/hack.js
export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  if (req.method !== "POST") return cors(json({ error: "Method not allowed" }, 405));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return cors(json({ error: "Missing GEMINI_API_KEY on server" }, 500));

  let body = {};
  try { body = await req.json(); } catch {}
  const { prompt = "random useful hack for anyone", langHint = "auto" } = body;

  const modelPrompt = buildPrompt(prompt, langHint);

  // TRY ONLY VALID, CURRENT IDS — no plain "gemini-1.5-flash"
  const BASES = ["v1beta", "v1"];
  const MODELS = [
    "models/gemini-1.5-flash-latest",
    "models/gemini-1.5-flash-8b-latest",
    "models/gemini-1.5-flash-001",
    "models/gemini-1.5-flash-8b-001",
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  try {
    let lastErr = "";
    for (const base of BASES) {
      for (const model of MODELS) {
        const url = `https://generativelanguage.googleapis.com/${base}/${model}:generateContent?key=${apiKey}`;
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
          return cors(json(parsed, 200), { "X-Gemini-Model": `${base}/${model}` });
        } else {
          lastErr = await resp.text();
          // If it isn't a 404 (model not found), bail early
          if (resp.status !== 404) {
            clearTimeout(timer);
            return cors(json({ error: `Gemini error: ${resp.status} ${lastErr}` }, resp.status), {
              "X-Gemini-Model": `${base}/${model}`,
            });
          }
        }
      }
    }

    clearTimeout(timer);
    return cors(json({ error: `Gemini error: 404 ${lastErr || "No compatible model found."}` }, 404));
  } catch (e) {
    clearTimeout(timer);
    const isAbort = e?.name === "AbortError";
    return cors(json({ error: isAbort ? "Upstream timeout" : (e?.message || "Server error") }, isAbort ? 504 : 500));
  }
}

/* helpers */
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
function cors(res, extra = {}) {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  for (const [k, v] of Object.entries(extra)) h.set(k, v);
  return new Response(res.body, { status: res.status, headers: h });
}
