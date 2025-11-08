// FILE: api/hack-debug.js
export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type":"application/json" } });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return new Response(JSON.stringify({ error: "Missing GEMINI_API_KEY on server" }), { status: 500, headers: { "Content-Type":"application/json" } });

  let body = {};
  try { body = await req.json(); } catch {}
  const { prompt = "debug: random useful hack for anyone", langHint = "auto" } = body;

  // pick a model quickly (flash-latest first)
  const bases = ["v1beta", "v1"];
  const models = [
    "models/gemini-flash-latest",
    "models/gemini-1.5-flash-latest",
    "models/gemini-1.5-flash-8b-latest",
    "models/gemini-1.5-flash-001",
    "models/gemini-1.5-flash-8b-001"
  ];

  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), 20000);

  try {
    for (const base of bases) {
      for (const model of models) {
        const url = `https://generativelanguage.googleapis.com/${base}/${model}:generateContent?key=${key}`;
        const payload = {
          contents: [{ role: "user", parts: [{ text: `
You generate a single clever hack. Detect user's language (Marathi/English), reply in that language. Return ONLY JSON:
{ "title":"", "description":"", "category":"", "difficulty":"Easy|Medium|Advanced", "usefulness":0, "bonus":"" }
User prompt: ${prompt}
Lang hint: ${langHint}
`.trim() }]}],
          generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
        };

        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        const text = await resp.text().catch(() => "");
        let upstream = null; try { upstream = JSON.parse(text); } catch { upstream = text; }

        if (resp.ok) {
          clearTimeout(timer);
          return new Response(JSON.stringify({
            pickedModel: `${base}/${model}`,
            status: resp.status,
            upstream
          }, null, 2), { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } });
        } else {
          // keep trying, but include the last failure at the end
          var last = { base, model, status: resp.status, upstream };
        }
      }
    }

    clearTimeout(timer);
    return new Response(JSON.stringify({
      error: "All attempted models failed",
      lastTried: last || null
    }, null, 2), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (e) {
    clearTimeout(timer);
    return new Response(JSON.stringify({ error: e?.message || String(e) }, null, 2), {
      status: 500, headers: { "Content-Type":"application/json" }
    });
  }
}
