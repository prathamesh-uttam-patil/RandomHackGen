/**
 * Strips markdown code fences from JSON strings
 */
export function stripJsonFences(text) {
  if (!text) return text
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

/**
 * Detects if text is primarily Marathi
 */
export function detectLanguage(text) {
  if (!text) return 'en'
  // Marathi Unicode range: U+0900-U+097F
  const marathiRegex = /[\u0900-\u097F]/
  const marathiCount = (text.match(/[\u0900-\u097F]/g) || []).length
  const totalChars = text.replace(/\s/g, '').length
  return marathiCount > totalChars * 0.1 ? 'mr' : 'en'
}

