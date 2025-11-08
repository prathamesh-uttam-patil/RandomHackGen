// FILE: api/hack-debug.js
export const config = { runtime: "edge" };

/**
 * Debug endpoint: discovers a usable model, calls it, and returns the raw Gemini response.
 * Use this only for debugging — it returns the full upstream JSON.
 *
 * Request body (JSON):
 * { "prompt": "optional prompt", "langHint": "auto" }
 *
 * Response: raw Gemini JSON (no parsing).
 */
export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type":"application/json" } });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY on server" }), { status: 500, headers: { "Content-Type":"application/json" } });

  let body = {};
  try { body = await req.json(); } catch {}
  const { prompt = "debug: random useful hack for anyone", langHint = "auto" } = body;

  // reuse discovery logic (v1beta -> v1)
  async function discover(apiKey, signal) {
    const bases = ["v1beta", "v1"];
    for (const base of bases) {
      const url = `https://generativelanguage.googleapis.com/${base}/models?key=${apiKey}`;
      try {
        const r = await fetch(url, { signal });
        if (!r.ok) continue;
        const j = await r.json().catch(() => null);
        const models = Array.isArray(j?.models) ? j.models : [];
        const usable = models.filter(m => Array.isArray(m?.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"));
        if (!usable.length) continue;
        usable.sort((a,b) => score(b) - score(a));
        return { base, name: usable[0].name };
      } catch(e) {
        continue;
      }
    }
    return null;
    function score(m){ const n=String(m?.name||"").toLowerCase(); let s=0; if(n.includes("flash")) s+=5; if(n.includes("1.5")) s+=3; if(n.includes("latest")) s+=2; if(n.includes("8b")) s+=1; return s; }
  }

  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), 20000);

  try {
    const pick = await discover(apiKey, controller.signal);
    if (!pick) return new Response(JSON.stringify({ error: "No compatible model found" }), { status: 404, headers: { "Content-Type":"application/json" } });

    const url = `https://generativelanguage.googleapis.com/${pick.base}/${pick.name}:generateContent?key=${apiKey}`;
    const modelPrompt = `
You generate a single clever hack. Detect user's language; reply in Marathi if input is Marathi, else English.
Return ONLY JSON.
User prompt: ${prompt}
Lang hint: ${langHint}
`.trim();

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: modelPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 400 }
      }),
      signal: controller.signal
    });

    clearTimeout(timer);

    // Return full upstream body and headers for debugging
    const upstreamText = await resp.text().catch(() => null);
    const out = {
      pickedModel: `${pick.base}/${pick.name}`,
      status: resp.status,
      upstream: upstreamText ? (() => {
        try { return JSON.parse(upstreamText); } catch { return upstreamText; }
      })() : null
    };
    return new Response(JSON.stringify(out, null, 2), { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } });

  } catch (e) {
    clearTimeout(timer);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500, headers: { "Content-Type":"application/json" } });
  } finally {
    clearTimeout(timer);
  }
}
