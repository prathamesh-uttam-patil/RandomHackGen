import { stripJsonFences, detectLanguage } from './jsonUtils'

/**
 * Generates a random hack by calling the API
 */
export async function generateHack(prompt = '') {
  const langHint = prompt ? detectLanguage(prompt) : 'en'
  
  try {
    const response = await fetch('/api/hack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt || 'random useful hack for anyone',
        langHint,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    
    // Strip any markdown fences
    const cleanedJson = stripJsonFences(data.content || data)
    const hack = typeof cleanedJson === 'string' ? JSON.parse(cleanedJson) : cleanedJson
    
    return hack
  } catch (error) {
    console.error('Error generating hack:', error)
    throw error
  }
}

