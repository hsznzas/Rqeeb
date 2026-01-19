import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'GOOGLE_AI_'])
  
  return {
  plugins: [
    react(),
    // Local API handler for development (Google Gemini)
    {
      name: 'api-handler',
      configureServer(server) {
        server.middlewares.use('/api/analyze', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }

          // Get Google AI API key from environment
          const GOOGLE_AI_API_KEY = env.GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY

          if (!GOOGLE_AI_API_KEY) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              transactions: [],
              error: 'AI not configured',
              reason: 'GOOGLE_AI_API_KEY environment variable is missing. Set it in .env.local',
            }))
            return
          }

          // Read request body
          let body = ''
          for await (const chunk of req) {
            body += chunk
          }

          try {
            const { text, currentDateTime, customCategories } = JSON.parse(body)

            if (!text || typeof text !== 'string') {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                transactions: [],
                error: 'Invalid request',
                reason: 'Missing or invalid "text" field',
              }))
              return
            }

            // System prompt for parsing
            const SYSTEM_PROMPT = `You are a financial transaction parser for a Saudi Arabian personal finance app. Extract structured data from text messages.

RULES:
1. Return ONLY valid JSON - an array of transaction objects
2. Parse EACH transaction individually
3. Return dates in ISO 8601 format: "YYYY-MM-DDTHH:MM:SS"
4. Default currency to SAR if not specified
5. USER'S CUSTOM CATEGORIES will be provided below - ALWAYS prefer custom categories when they match!

Return this structure:
{
  "transactions": [
    {
      "amount": <number>,
      "currency": "<string>",
      "category": "<string>",
      "merchant": "<string or null>",
      "transaction_datetime": "<ISO 8601>",
      "direction": "<in or out>",
      "payment_hint": "<string or null>",
      "notes": "<string or null>",
      "description": "<string or null>"
    }
  ]
}

Default categories: Food & Dining, Transportation, Shopping, Bills & Utilities, Groceries, Health, Transfer, Entertainment, Income, Travel, Education, Advertising, Subscription, Other

If cannot parse, return: {"transactions": [], "error": "...", "reason": "..."}`

            // Build custom categories prompt section
            let customCategoriesPrompt = ''
            if (customCategories && Array.isArray(customCategories) && customCategories.length > 0) {
              const categoryLines = customCategories
                .filter((c: { name: string; description?: string | null }) => c.name)
                .map((c: { name: string; description?: string | null }) => {
                  if (c.description) {
                    return `- "${c.name}": ${c.description}`
                  }
                  return `- "${c.name}"`
                })
                .join('\n')
              
              if (categoryLines) {
                customCategoriesPrompt = `\n\nUSER'S CUSTOM CATEGORIES (prefer these when applicable):\n${categoryLines}`
              }
            }

            // Call Google Gemini API
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [{
                  parts: [{
                    text: `${SYSTEM_PROMPT}${customCategoriesPrompt}\n\nCurrent date/time: ${currentDateTime || new Date().toISOString()}\n\nParse these transactions:\n\n${text}`
                  }]
                }],
                generationConfig: {
                  temperature: 0.1,
                  maxOutputTokens: 4000,
                }
              }),
            })

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } }
              res.statusCode = response.status
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                transactions: [],
                error: 'AI service error',
                reason: errorData.error?.message || `HTTP ${response.status}`,
              }))
              return
            }

            const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text

            if (!content) {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                transactions: [],
                error: 'Empty response',
                reason: 'AI returned no content',
              }))
              return
            }

            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (!jsonMatch) {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                transactions: [],
                error: 'Invalid response format',
                reason: 'Could not find JSON in AI response',
              }))
              return
            }

            const parsed = JSON.parse(jsonMatch[0])
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(parsed))

          } catch (error) {
            console.error('API error:', error)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              transactions: [],
              error: 'Server error',
              reason: 'Could not process request',
            }))
          }
        })
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Load environment variables
  envPrefix: ['VITE_', 'GOOGLE_AI_'],
  }
})
