// FILE: api/debug-models.js
export const config = { runtime: "edge" };

export default async function handler() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json({ error: "Missing GEMINI_API_KEY on server" }, 500);

  const bases = ["v1beta", "v1"];
  const out = [];

  for (const base of bases) {
    const url = `https://generativelanguage.googleapis.com/${base}/models?key=${key}`;
    const r = await fetch(url);
    const text = await r.text().catch(() => "");
    let parsed = null;
    try { parsed = JSON.parse(text); } catch {}

    out.push({
      base,
      status: r.status,
      ok: r.ok,
      raw: parsed ?? text, // show whatever we got
      models: Array.isArray(parsed?.models)
        ? parsed.models.map(m => ({
            name: m.name,
            methods: m.supportedGenerationMethods
          }))
        : null,
    });
  }

  return json({ discovered: out });
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
