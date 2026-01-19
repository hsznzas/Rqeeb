/**
 * Vercel Serverless Function: Transaction Analyzer
 * 
 * This function securely calls Google Gemini from the server side,
 * keeping the API key hidden from the browser.
 * 
 * Supports BULK processing of up to 50 transactions at once.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

// System prompt for bulk financial parsing with RICH DATA extraction
const SYSTEM_PROMPT = `You are a financial transaction parser for a Saudi Arabian personal finance app. Your job is to extract structured data from text messages (like bank SMS, receipts, or manual notes).

CRITICAL RULES:
1. Return ONLY valid JSON - an array of transaction objects
2. You MUST ALWAYS return a JSON array of transactions, even if there's only one transaction
3. The input may contain MANY transactions (up to 50) separated by newlines, paragraph breaks, or listed together
4. Parse EACH transaction individually - do not skip any

DATE & TIME EXTRACTION (CRITICAL):
- Extract the EXACT date and time from the input if provided
- Return dates in ISO 8601 format: "YYYY-MM-DDTHH:MM:SS" (e.g., "2026-01-04T13:52:00")
- If only date is provided (no time), use "T00:00:00" (e.g., "2026-01-04T00:00:00")
- If only time is provided, use today's date
- If no date/time is provided, use the current timestamp provided below
- PRESERVE the original date from the input - do NOT default to today's date if a specific date is given
- Accept future dates without modification (user may be planning entries)
- Handle relative dates: "Yesterday" = previous day, "Last Monday" = the most recent Monday before today

AMOUNT RULES:
- Extract each transaction amount as a positive number
- Determine if money is coming IN (income/received/deposit/salary/credit) or going OUT (expense/payment/purchase/spent/debit)

CATEGORIZATION:
- Identify the merchant/source if mentioned
- Look for payment method hints - any mention of card name, bank name, last 4 digits (like *552), or wallet type
- Default categories: Food & Dining, Transportation, Shopping, Bills & Utilities, Groceries, Health, Transfer, Entertainment, Income, Travel, Education, Advertising, Subscription, Other
- USER'S CUSTOM CATEGORIES will be provided below - ALWAYS prefer custom categories when they match!
- Default currency to SAR if not specified. Recognize: SAR, USD, EUR, GBP, AED, ريال, $, €, £

RICH DATA EXTRACTION (CRITICAL - DO NOT DISCARD):
Bank SMS messages contain valuable auxiliary information. You MUST extract ALL of the following into the "description" field:
- Available Balance (e.g., "Available Balance: AED 67471.11")
- Reference Numbers (e.g., "Ref: 123456789")
- Campaign names or purposes (e.g., "For: Ajdel Campaign", "For Campaign X")
- Account indicators (e.g., "Account: *552", "a/c *1234")
- Transaction IDs or authorization codes
- Any other context that isn't the date, merchant, amount, or category

Format the description as: "Key1: Value1 | Key2: Value2 | Key3: Value3"

PAYMENT METHOD HINT EXAMPLES:
- "on my Visa" → payment_hint: "Visa"
- "from AlRajhi" → payment_hint: "AlRajhi"
- "card ending 8844" → payment_hint: "8844"
- "a/c *552" → payment_hint: "*552"
- "using Apple Pay" → payment_hint: "Apple Pay"
- "paid cash" → payment_hint: "cash"
- "from wallet" → payment_hint: "wallet"
- "debited from your a/c *552" → payment_hint: "*552"

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
      "notes": "<user notes or null>",
      "description": "<auxiliary info: balance, refs, campaign, account details | null>"
    }
  ]
}

EXAMPLES:

Example 1 - Simple transaction:
Input: "Coffee 25 SAR on 2026-01-04 at 2:30pm"
Output: {"transactions": [{"amount": 25, "currency": "SAR", "category": "Food & Dining", "merchant": "Coffee", "transaction_datetime": "2026-01-04T14:30:00", "direction": "out", "payment_hint": null, "notes": null, "description": null}]}

Example 2 - Multiple transactions:
Input: "Uber 45 on Jan 3rd, Starbucks 30 yesterday"
(If today is 2026-01-04)
Output: {"transactions": [
  {"amount": 45, "currency": "SAR", "category": "Transportation", "merchant": "Uber", "transaction_datetime": "2026-01-03T00:00:00", "direction": "out", "payment_hint": null, "notes": null, "description": null},
  {"amount": 30, "currency": "SAR", "category": "Food & Dining", "merchant": "Starbucks", "transaction_datetime": "2026-01-03T00:00:00", "direction": "out", "payment_hint": null, "notes": null, "description": null}
]}

Example 3 - Bank SMS with RICH DATA (CRITICAL):
Input: "ADIB Transaction
Transaction of AED 244.20 debited from your a/c *552
at TIKTOK ADS – AD S.TIKTOK.CO IE
Time: Yesterday, 9:14 PM
Available Balance: AED 67471.11
For : Ajdel CFL03 Campaign"
(If today is 2026-01-10)
Output: {"transactions": [{"amount": 244.20, "currency": "AED", "category": "Advertising", "merchant": "TIKTOK ADS", "transaction_datetime": "2026-01-09T21:14:00", "direction": "out", "payment_hint": "*552", "notes": null, "description": "Available Balance: AED 67471.11 | For: Ajdel CFL03 Campaign | Account: *552"}]}

Example 4 - Salary/Income:
Input: "Salary received 8000 SAR on Jan 1st"
Output: {"transactions": [{"amount": 8000, "currency": "SAR", "category": "Income", "merchant": "Salary", "transaction_datetime": "2026-01-01T00:00:00", "direction": "in", "payment_hint": null, "notes": null, "description": null}]}

If you cannot parse ANY valid financial data, return:
{"transactions": [], "error": "Could not parse transactions", "reason": "<brief explanation>"}`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Get API key from server environment (NOT exposed to browser)
  const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY

  if (!GOOGLE_AI_API_KEY) {
    console.error('Google AI API key not configured on server')
    return res.status(500).json({
      transactions: [],
      error: 'AI not configured',
      reason: 'Server-side GOOGLE_AI_API_KEY is missing',
    })
  }

  const { text, currentDateTime, customCategories } = req.body

  if (!text || typeof text !== 'string') {
    return res.status(400).json({
      transactions: [],
      error: 'Invalid request',
      reason: 'Missing or invalid "text" field in request body',
    })
  }

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

  try {
    // Call Google Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${SYSTEM_PROMPT}${customCategoriesPrompt}\n\nCurrent date/time: ${currentDateTime || new Date().toISOString()}\n\nParse these financial transactions (there may be multiple):\n\n${text}`
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8000,
        }
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Google Gemini API error:', response.status, errorData)
      return res.status(response.status).json({
        transactions: [],
        error: 'AI service error',
        reason: (errorData as { error?: { message?: string } }).error?.message || `HTTP ${response.status}`,
      })
    }

    const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text

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
