/**
 * OpenAI Service Configuration
 * 
 * This service can be used for AI-powered features like:
 * - Smart transaction categorization
 * - Receipt OCR processing
 * - Natural language transaction parsing
 */

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || ''

const OPENAI_API_URL = 'https://api.openai.com/v1'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: ChatMessage
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Send a chat completion request to OpenAI
 */
export async function chatCompletion(
  messages: ChatMessage[],
  options?: {
    model?: string
    temperature?: number
    maxTokens?: number
  }
): Promise<string> {
  const { model = 'gpt-4o-mini', temperature = 0.7, maxTokens = 500 } = options || {}

  const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'OpenAI API request failed')
  }

  const data: ChatCompletionResponse = await response.json()
  return data.choices[0]?.message?.content || ''
}

/**
 * Parse a transaction from natural language using AI
 */
export async function parseTransactionWithAI(text: string): Promise<{
  amount: number | null
  currency: string
  direction: 'in' | 'out'
  category: string
  merchant: string | null
  confidence: number
} | null> {
  const systemPrompt = `You are a financial transaction parser. Extract transaction details from the text.
Return ONLY a JSON object with these fields:
- amount: number (the transaction amount, positive number)
- currency: string (SAR, USD, etc. Default to SAR if not specified)
- direction: "in" or "out" (income or expense)
- category: string (Food & Dining, Transportation, Shopping, Bills & Utilities, Groceries, Health, Transfer, Other)
- merchant: string or null (business name if mentioned)
- confidence: number 0-1 (how confident you are)

If you cannot parse a valid transaction, return null.`

  try {
    const response = await chatCompletion([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ], { temperature: 0.3 })

    // Try to parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    return null
  } catch (error) {
    console.error('AI parsing failed:', error)
    return null
  }
}

/**
 * Check if OpenAI API is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-')
}

