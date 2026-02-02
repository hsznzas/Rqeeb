/**
 * Vercel Serverless Function: Smart CSV Analyzer
 * 
 * This function uses AI to intelligently parse CSV bank statements
 * with user-provided context and can ask clarifying questions.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY

// System prompt for CSV analysis
const SYSTEM_PROMPT = `You are an intelligent CSV parser for a personal finance app. Your job is to analyze bank statement CSV files and extract transactions.

IMPORTANT BEHAVIORS:
1. Analyze the CSV structure (columns, data types, patterns)
2. Apply any user-provided context/filters (currency, date range, account)
3. If something is unclear or ambiguous, ASK A CLARIFYING QUESTION instead of guessing
4. Return structured transaction data that can be reviewed by the user

COLUMN DETECTION:
- Date columns: Look for "date", "transaction date", "posting date", "value date", "time"
- Description columns: Look for "description", "details", "narrative", "merchant", "memo", "particulars"
- Amount columns: Look for "amount", "value", "debit", "credit", "withdrawal", "deposit"
  - IMPORTANT: Column names like "Debit_AED" or "Credit_USD" contain BOTH the type AND currency
  - Extract currency from column name if present (e.g., "Debit_AED" → currency is AED)
- Separate debit/credit columns: Debits are expenses (out), Credits are income (in)
- If amount is negative, it's an expense; if positive, it's income (unless separate columns exist)

FILTERING:
- Apply date filters if user specifies (e.g., "only January 2026", "Dec 15 to Jan 15")
- Apply currency filters if user specifies (e.g., "ignore USD transactions")
- Skip rows with empty amounts (pending transactions) unless user says otherwise
- Apply any merchant/description filters (e.g., "skip fee transactions")

WHEN TO ASK QUESTIONS:
- If you can't determine what's a date vs description column
- If there are multiple amount columns and you're unsure how to interpret them
- If the currency is ambiguous
- If the date format is unclear (is "01/02/26" January 2nd or February 1st?)
- If the user's instructions are ambiguous

RESPONSE FORMAT:
Return JSON in ONE of two formats:

Format 1 - Parsed Transactions (when everything is clear):
{
  "type": "transactions",
  "summary": "Found X transactions totaling Y currency...",
  "transactions": [
    {
      "amount": <number>,
      "currency": "<string>",
      "category": "<string>",
      "merchant": "<string or null>",
      "transaction_datetime": "<ISO 8601>",
      "direction": "<in or out>",
      "description": "<string or null>"
    }
  ],
  "skipped": {
    "count": <number>,
    "reasons": ["<reason1>", "<reason2>"]
  }
}

Format 2 - Clarifying Question (when something is unclear):
{
  "type": "question",
  "question": "<your question>",
  "context": "<why you're asking>",
  "options": ["<option1>", "<option2>", "<option3>"],
  "allowCustom": true
}

CATEGORIZATION:
Use these categories: Food & Dining, Transportation, Shopping, Bills & Utilities, Groceries, Health, Transfer, Entertainment, Income, Travel, Education, Advertising, Subscription, Other

Common merchant patterns:
- POS-*-CAREEM, UBER → Transportation
- POS-*-Talabat, restaurant names → Food & Dining
- NOON, Amazon → Shopping
- ADNOC, EPPCO → Transportation (fuel)
- Salary, TRANSFER FROM → Income
- Fee+VAT → Bills & Utilities

Current date: ${new Date().toISOString().split('T')[0]}`

interface AnalyzeCSVRequest {
  csvContent: string
  instructions: string
  previousAnswer?: string
  conversationContext?: string
}

interface Transaction {
  amount: number
  currency: string
  category: string
  merchant: string | null
  transaction_datetime: string
  direction: 'in' | 'out'
  description: string | null
}

interface TransactionsResponse {
  type: 'transactions'
  summary: string
  transactions: Transaction[]
  skipped: {
    count: number
    reasons: string[]
  }
}

interface QuestionResponse {
  type: 'question'
  question: string
  context: string
  options: string[]
  allowCustom: boolean
}

type AIResponse = TransactionsResponse | QuestionResponse

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!GOOGLE_AI_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' })
  }

  try {
    const { csvContent, instructions, previousAnswer, conversationContext } = req.body as AnalyzeCSVRequest

    if (!csvContent) {
      return res.status(400).json({ error: 'CSV content is required' })
    }

    // Build the user prompt
    let userPrompt = `Analyze this CSV bank statement.\n\n`
    
    if (instructions) {
      userPrompt += `USER INSTRUCTIONS: "${instructions}"\n\n`
    }
    
    if (conversationContext) {
      userPrompt += `PREVIOUS CONTEXT: ${conversationContext}\n\n`
    }
    
    if (previousAnswer) {
      userPrompt += `USER'S ANSWER TO YOUR QUESTION: "${previousAnswer}"\n\n`
    }

    // Include CSV content (limit to prevent token overflow)
    const csvLines = csvContent.split('\n')
    const header = csvLines[0]
    const dataRows = csvLines.slice(1).filter(row => row.trim())
    
    userPrompt += `CSV HEADERS:\n${header}\n\n`
    userPrompt += `TOTAL ROWS: ${dataRows.length}\n\n`
    
    // Include first 20 rows as sample, and last 5 for variety
    const sampleRows = [
      ...dataRows.slice(0, 20),
      ...(dataRows.length > 25 ? ['...', ...dataRows.slice(-5)] : [])
    ]
    userPrompt += `SAMPLE DATA (first 20 rows + last 5):\n${sampleRows.join('\n')}\n\n`
    
    // Include ALL rows for parsing (up to 200)
    if (dataRows.length <= 200) {
      userPrompt += `FULL DATA FOR PARSING:\n${dataRows.join('\n')}\n\n`
    } else {
      userPrompt += `NOTE: CSV has ${dataRows.length} rows. Processing first 200.\n`
      userPrompt += `FULL DATA FOR PARSING:\n${dataRows.slice(0, 200).join('\n')}\n\n`
    }

    userPrompt += `Please analyze this CSV and either:
1. Return parsed transactions if everything is clear
2. Ask a clarifying question if something is ambiguous

Return your response as JSON.`

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: SYSTEM_PROMPT }]
            },
            {
              role: 'model',
              parts: [{ text: 'I understand. I will analyze CSV bank statements, apply user context, and either return parsed transactions or ask clarifying questions. I will return JSON responses.' }]
            },
            {
              role: 'user',
              parts: [{ text: userPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
          }
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } }
      console.error('Gemini API error:', errorData)
      return res.status(500).json({ 
        error: 'AI service error',
        details: errorData.error?.message 
      })
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>
        }
      }>
    }
    
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (!aiResponse) {
      return res.status(500).json({ error: 'No response from AI' })
    }

    // Parse the JSON response
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiResponse.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, aiResponse]
      const jsonString = jsonMatch[1] || aiResponse
      
      const parsed = JSON.parse(jsonString) as AIResponse
      
      // Validate response structure
      if (parsed.type === 'transactions') {
        // Ensure transactions array exists
        if (!Array.isArray(parsed.transactions)) {
          parsed.transactions = []
        }
        // Ensure skipped object exists
        if (!parsed.skipped) {
          parsed.skipped = { count: 0, reasons: [] }
        }
      } else if (parsed.type === 'question') {
        // Ensure required fields exist
        if (!parsed.options) {
          parsed.options = []
        }
        if (parsed.allowCustom === undefined) {
          parsed.allowCustom = true
        }
      }
      
      return res.status(200).json(parsed)
    } catch {
      // If JSON parsing fails, try to extract useful info
      console.error('Failed to parse AI response:', aiResponse)
      
      // Check if it looks like a question
      if (aiResponse.toLowerCase().includes('?') && aiResponse.length < 500) {
        return res.status(200).json({
          type: 'question',
          question: aiResponse.trim(),
          context: 'The AI needs clarification',
          options: [],
          allowCustom: true
        })
      }
      
      return res.status(500).json({ 
        error: 'Failed to parse AI response',
        rawResponse: aiResponse.substring(0, 500)
      })
    }

  } catch (error) {
    console.error('CSV analysis error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
