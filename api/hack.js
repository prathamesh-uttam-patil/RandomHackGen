// FILE: api/hack.js

// Run on the Edge close to India POP to reduce latency.
// Pin to edge and (optionally) region.
export const config = {
  runtime: "edge",
  regions: ["bom1"], // optional; remove if your project plan doesn't support regions
};

export default async function handler(req) {
  // CORS + preflight
  if (req.method === "OPTIONS") {
    return cors(new Response(null, { status: 204 }));
  }
  if (req.method !== "POST") {
    return cors(json({ error: "Method not allowed" }, 405));
  }

  let body = {};
  try {
    body = await req.json();
  } catch {}

  const {
    prompt = "random useful hack for anyone",
    langHint = "auto",
  } = body;

  // IMPORTANT: use a *server-side* secret on Vercel: GEMINI_API_KEY
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    return cors(json({ error: "Missing GEMINI_API_KEY on server" }, 500));
  }

  // Build a short, fast prompt to reduce latency
  const modelPrompt = `
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

User prompt: ${prompt}
Language hint: ${langHint}
`.trim();

  // Abort after 20s so Vercel doesn't kill the function
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  try {
    const resp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
        geminiApiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: modelPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 300, // keep small for speed
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timer);

    if (!resp.ok) {
      const text = await resp.text();
      return cors(json({ error: `Gemini error: ${resp.status} ${text}` }, resp.status));
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Model might wrap JSON in ``` fences; extract and parse
    const parsed = JSON.parse(extractJSON(text));

    return cors(json(parsed, 200));
  } catch (e) {
    clearTimeout(timer);
    const isAbort = e?.name === "AbortError";
    return cors(json({ error: isAbort ? "Upstream timeout" : (e?.message || "Server error") }, isAbort ? 504 : 500));
  }
}

/* ---------- helpers ---------- */

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
