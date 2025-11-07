// FILE: api/hack.js

/**
 * Serverless API route for generating hacks using Gemini or Claude
 * This file should be deployed as a serverless function (Vercel, Netlify, etc.)
 * For local development with Vite, you may need to use a different approach
 */

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { prompt = 'random useful hack for anyone', langHint = 'en' } = await req.json()

    // Use Gemini by default
    const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY
    
    if (!geminiApiKey) {
      throw new Error('VITE_GEMINI_API_KEY is not set')
    }

    const modelPrompt = `You generate a single clever, unique hack.

Detect the user's input language; if Marathi then respond in Marathi; if English then respond in English. Mirror the user's language. Do NOT translate unless explicitly asked.

Output ONLY valid JSON, no markdown, no extra text:

{
  "title": "",
  "description": "",
  "category": "",
  "difficulty": "Easy | Medium | Advanced",
  "usefulness": 0,
  "bonus": ""
}

Ensure JSON is strictly valid with double quotes and no trailing commas.

User prompt: ${prompt}
Language hint: ${langHint}`

    // Call Gemini API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: modelPrompt,
                },
              ],
            },
          ],
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`)
    }

    const geminiData = await geminiResponse.json()
    const content = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!content) {
      throw new Error('No content received from Gemini')
    }

    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('API error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

