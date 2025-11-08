// FILE: api/hack.js
export const config = {
  runtime: "edge",
  // regions: ["bom1"], // optional; comment out if plan doesn't support region pinning
};

export default async function handler(req) {
  if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));
  if (req.method !== "POST") return cors(json({ error: "Method not allowed" }, 405));

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return cors(json({ error: "Missing GEMINI_API_KEY on server" }, 500));

  let body = {};
  try { body = await req.json(); } catch {}
  const { prompt = "random useful hack for anyone", langHint = "auto" } = body;

  const modelPrompt = buildPrompt(prompt, langHint);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  try {
    // 1) Discover a valid model that supports generateContent
    const discovery = await discoverModel(apiKey, controller.signal);
    if (!discovery) {
      clearTimeout(timer);
      return cors(json({ error: "No compatible Gemini model found for generateContent." }, 404));
    }

    const { base, modelName } = discovery; // base: "v1beta" or "v1"; modelName: "models/gemini-1.5-flash-latest" etc.
    const url = `https://generativelanguage.googleapis.com/${base}/${modelName}:generateContent?key=${apiKey}`;

    // 2) Call the chosen model
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: modelPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!resp.ok) {
      const errText = await resp.text();
      return cors(json({ error: `Gemini error: ${resp.status} ${errText}` }, resp.status), {
        "X-Gemini-Model": modelName,
      });
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = JSON.parse(extractJSON(text));

    return cors(json(parsed, 200), { "X-Gemini-Model": modelName });
  } catch (e) {
    clearTimeout(timer);
    const isAbort = e?.name === "AbortError";
    return cors(
      json({ error: isAbort ? "Upstream timeout" : (e?.message || "Server error") }, isAbort ? 504 : 500)
    );
  }
}

/* ---------------- helpers ---------------- */

async function discoverModel(apiKey, signal) {
  // Try v1beta first, then v1
  const bases = ["v1beta", "v1"];
  for (const base of bases) {
    const url = `https://generativelanguage.googleapis.com/${base}/models?key=${apiKey}`;
    const r = await fetch(url, { signal });
    if (!r.ok) continue;

    const j = await r.json().catch(() => null);
    const models = Array.isArray(j?.models) ? j.models : [];
    // Keep only models that support generateContent
    const usable = models.filter((m) =>
      Array.isArray(m?.supportedGenerationMethods) &&
      m.supportedGenerationMethods.includes("generateContent")
    );

    if (!usable.length) continue;

    // Prefer flash (fast), 1.5, latest variants
    usable.sort((a, b) => score(b) - score(a));
    const best = usable[0];
    if (best?.name) return { base, modelName: best.name };
  }
  return null;

  function score(m) {
    const n = String(m.name || "");
    let s = 0;
    if (n.includes("flash")) s += 5;
    if (n.includes("1.5")) s += 3;
    if (n.includes("latest")) s += 2;
    if (n.includes("8b")) s += 1; // smaller, faster
    return s;
  }
}

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
