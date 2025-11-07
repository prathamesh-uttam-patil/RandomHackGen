import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      react(),
      {
        name: 'api-plugin',
        configureServer(server) {
          server.middlewares.use('/api/hack', async (req, res, next) => {
            if (req.method !== 'POST') {
              res.writeHead(405, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Method not allowed' }))
              return
            }

            let body = ''
            req.on('data', chunk => { body += chunk.toString() })
            req.on('end', async () => {
              try {
                const { prompt = 'random useful hack for anyone', langHint = 'en' } = JSON.parse(body)

                // Use Gemini by default
                const geminiApiKey = env.VITE_GEMINI_API_KEY
                
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

                // Call Gemini API - using gemini-2.5-flash (stable version)
                const geminiResponse = await fetch(
                  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
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

                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ content }))

                // ALTERNATIVE: Claude API (commented out)
                /*
                const anthropicApiKey = env.VITE_ANTHROPIC_API_KEY
                
                if (!anthropicApiKey) {
                  throw new Error('VITE_ANTHROPIC_API_KEY is not set')
                }

                const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': anthropicApiKey,
                    'anthropic-version': '2023-06-01',
                  },
                  body: JSON.stringify({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 1024,
                    messages: [
                      {
                        role: 'user',
                        content: modelPrompt,
                      },
                    ],
                  }),
                })

                if (!claudeResponse.ok) {
                  const errorText = await claudeResponse.text()
                  throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`)
                }

                const claudeData = await claudeResponse.json()
                const content = claudeData.content?.[0]?.text

                if (!content) {
                  throw new Error('No content received from Claude')
                }

                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ content }))
                */
              } catch (error) {
                console.error('API error:', error)
                res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: error.message || 'Internal server error' }))
              }
            })
          })
        },
      },
    ],
  }
})
