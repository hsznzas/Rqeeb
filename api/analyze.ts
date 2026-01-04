/**
 * Vercel Serverless Function: Transaction Analyzer
 * 
 * This function securely calls OpenAI from the server side,
 * keeping the API key hidden from the browser.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

// System prompt for bulk financial parsing with proper date/time extraction
const SYSTEM_PROMPT = `You are a financial transaction parser for a Saudi Arabian personal finance app. Your job is to extract structured data from text messages (like bank SMS, receipts, or manual notes).

CRITICAL RULES:
1. Return ONLY valid JSON - an array of transaction objects
2. You MUST ALWAYS return a JSON array of transactions, even if there's only one transaction
3. The input may contain multiple transactions separated by newlines, commas, or listed together

DATE & TIME EXTRACTION (CRITICAL):
- Extract the EXACT date and time from the input if provided
- Return dates in ISO 8601 format: "YYYY-MM-DDTHH:MM:SS" (e.g., "2026-01-04T13:52:00")
- If only date is provided (no time), use "T00:00:00" (e.g., "2026-01-04T00:00:00")
- If only time is provided, use today's date
- If no date/time is provided, use the current timestamp provided below
- PRESERVE the original date from the input - do NOT default to today's date if a specific date is given
- Accept future dates without modification (user may be planning entries)

AMOUNT RULES:
- Extract each transaction amount as a positive number
- Determine if money is coming IN (income/received/deposit/salary) or going OUT (expense/payment/purchase/spent)

CATEGORIZATION:
- Identify the merchant/source if mentioned
- Look for payment method hints - any mention of card name, bank name, last 4 digits, or wallet type
- Categorize into: Food & Dining, Transportation, Shopping, Bills & Utilities, Groceries, Health, Transfer, Entertainment, Income, Travel, Education, Other
- Default currency to SAR if not specified. Recognize: SAR, USD, EUR, GBP, AED, ريال, $, €, £

PAYMENT METHOD HINT EXAMPLES:
- "on my Visa" → payment_hint: "Visa"
- "from AlRajhi" → payment_hint: "AlRajhi"
- "card ending 8844" → payment_hint: "8844"
- "using Apple Pay" → payment_hint: "Apple Pay"
- "paid cash" → payment_hint: "cash"
- "from wallet" → payment_hint: "wallet"

ALWAYS return this exact JSON structure (an array):
{
  "transactions": [
    {
      "amount": <number>,
      "currency": "<string, default SAR>",
      "category": "<string>",
      "merchant": "<string or null>",
      "transaction_datetime": "<ISO 8601 string, e.g. 2026-01-04T13:52:00>",
      "direction": "<in or out>",
      "payment_hint": "<string or null>",
      "notes": "<any additional context or null>"
    }
  ]
}

EXAMPLES:

Input: "Coffee 25 SAR on 2026-01-04 at 2:30pm"
Output: {"transactions": [{"amount": 25, "currency": "SAR", "category": "Food & Dining", "merchant": "Coffee", "transaction_datetime": "2026-01-04T14:30:00", "direction": "out", "payment_hint": null, "notes": null}]}

Input: "Uber 45 on Jan 3rd, Starbucks 30 yesterday"
(If today is 2026-01-04)
Output: {"transactions": [
  {"amount": 45, "currency": "SAR", "category": "Transportation", "merchant": "Uber", "transaction_datetime": "2026-01-03T00:00:00", "direction": "out", "payment_hint": null, "notes": null},
  {"amount": 30, "currency": "SAR", "category": "Food & Dining", "merchant": "Starbucks", "transaction_datetime": "2026-01-03T00:00:00", "direction": "out", "payment_hint": null, "notes": null}
]}

Input: "[{\\"date\\": \\"2026-01-02T10:15:00\\", \\"amount\\": 150, \\"merchant\\": \\"Amazon\\"}]"
Output: {"transactions": [{"amount": 150, "currency": "SAR", "category": "Shopping", "merchant": "Amazon", "transaction_datetime": "2026-01-02T10:15:00", "direction": "out", "payment_hint": null, "notes": null}]}

If you cannot parse ANY valid financial data, return:
{"transactions": [], "error": "Could not parse transactions", "reason": "<brief explanation>"}`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Get API key from server environment (NOT exposed to browser)
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY

  if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-')) {
    console.error('OpenAI API key not configured on server')
    return res.status(500).json({
      transactions: [],
      error: 'AI not configured',
      reason: 'Server-side OpenAI API key is missing',
    })
  }

  const { text, currentDateTime } = req.body

  if (!text || typeof text !== 'string') {
    return res.status(400).json({
      transactions: [],
      error: 'Invalid request',
      reason: 'Missing or invalid "text" field in request body',
    })
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Current date/time: ${currentDateTime || new Date().toISOString()}\n\nParse these financial transactions:\n\n${text}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OpenAI API error:', response.status, errorData)
      return res.status(response.status).json({
        transactions: [],
        error: 'AI service error',
        reason: errorData.error?.message || `HTTP ${response.status}`,
      })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return res.status(200).json({
        transactions: [],
        error: 'Empty response',
        reason: 'AI returned no content',
      })
    }

    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(200).json({
        transactions: [],
        error: 'Invalid response format',
        reason: 'Could not find JSON in AI response',
      })
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Return the parsed result directly
    return res.status(200).json(parsed)
  } catch (error) {
    console.error('Serverless function error:', error)

    if (error instanceof SyntaxError) {
      return res.status(200).json({
        transactions: [],
        error: 'Parse error',
        reason: 'AI response was not valid JSON',
      })
    }

    return res.status(500).json({
      transactions: [],
      error: 'Server error',
      reason: 'Could not process request',
    })
  }
}

