/**
 * Conversational AI Chat Endpoint
 * 
 * Handles questions about spending, budgets, and financial insights.
 * Uses Gemini to analyze transaction data and provide natural language responses.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY

const SYSTEM_PROMPT = `You are a helpful financial assistant for the Rqeeb expense tracking app. 
Your role is to answer questions about the user's spending habits, provide insights, and offer financial advice.

When answering questions:
1. Be specific and cite actual numbers from the provided transaction data
2. Format currency values properly (e.g., "AED 150.00" or "SAR 500.00")
3. Provide bullet points for detailed breakdowns
4. Be friendly but professional
5. If the data doesn't contain enough information to answer accurately, say so
6. When giving advice, be practical and actionable
7. Always respond in the same language as the user's question

For spending questions, analyze:
- Total amounts by category
- Trends over time
- Comparison periods
- Top merchants/vendors
- Average transaction sizes

Response format (JSON):
{
  "text": "Your main answer as a paragraph",
  "bullets": ["Bullet point 1", "Bullet point 2"],
  "data": {
    "totalAmount": 0,
    "transactionCount": 0,
    "topCategory": "string",
    "period": "string"
  }
}

Current date: ${new Date().toISOString().split('T')[0]}`

interface Transaction {
  amount: number
  currency: string
  category: string
  merchant: string | null
  transaction_date: string
  direction: 'in' | 'out'
  description: string | null
}

interface ChatRequest {
  message: string
  transactions: Transaction[]
  currency?: string
}

interface ChatResponse {
  type: 'answer'
  text: string
  bullets: string[]
  data: {
    totalAmount?: number
    transactionCount?: number
    topCategory?: string
    period?: string
    averageAmount?: number
    [key: string]: unknown
  }
}

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
    const { message, transactions, currency = 'SAR' } = req.body as ChatRequest

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    // Prepare transaction summary for the AI
    const transactionSummary = prepareTransactionSummary(transactions, currency)

    const userPrompt = `User's question: "${message}"

Transaction Data Summary:
${transactionSummary}

Raw transactions (last 100):
${JSON.stringify(transactions.slice(0, 100), null, 2)}

Please analyze the data and answer the user's question. Return a JSON response.`

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
              parts: [{ text: 'Understood. I will analyze transaction data and respond with helpful financial insights in JSON format.' }]
            },
            {
              role: 'user',
              parts: [{ text: userPrompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
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
    let parsedResponse: ChatResponse
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiResponse.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, aiResponse]
      const jsonString = jsonMatch[1] || aiResponse
      
      const parsed = JSON.parse(jsonString)
      parsedResponse = {
        type: 'answer',
        text: parsed.text || 'Unable to generate response',
        bullets: parsed.bullets || [],
        data: parsed.data || {}
      }
    } catch {
      // If JSON parsing fails, return the raw text
      parsedResponse = {
        type: 'answer',
        text: aiResponse,
        bullets: [],
        data: {}
      }
    }

    return res.status(200).json(parsedResponse)

  } catch (error) {
    console.error('Chat API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Prepare a summary of transactions for the AI
 */
function prepareTransactionSummary(transactions: Transaction[], currency: string): string {
  if (!transactions || transactions.length === 0) {
    return 'No transaction data available.'
  }

  // Calculate summary statistics
  const expenses = transactions.filter(t => t.direction === 'out')
  const income = transactions.filter(t => t.direction === 'in')
  
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0)
  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0)
  
  // Group by category
  const byCategory: Record<string, { count: number; total: number }> = {}
  for (const tx of expenses) {
    const cat = tx.category || 'Other'
    if (!byCategory[cat]) {
      byCategory[cat] = { count: 0, total: 0 }
    }
    byCategory[cat].count++
    byCategory[cat].total += tx.amount
  }
  
  // Group by month
  const byMonth: Record<string, { expenses: number; income: number }> = {}
  for (const tx of transactions) {
    const month = tx.transaction_date?.slice(0, 7) || 'Unknown'
    if (!byMonth[month]) {
      byMonth[month] = { expenses: 0, income: 0 }
    }
    if (tx.direction === 'out') {
      byMonth[month].expenses += tx.amount
    } else {
      byMonth[month].income += tx.amount
    }
  }
  
  // Top merchants
  const merchantSpend: Record<string, number> = {}
  for (const tx of expenses) {
    const merchant = tx.merchant || 'Unknown'
    merchantSpend[merchant] = (merchantSpend[merchant] || 0) + tx.amount
  }
  const topMerchants = Object.entries(merchantSpend)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
  
  // Date range
  const dates = transactions
    .map(t => t.transaction_date)
    .filter(Boolean)
    .sort()
  const dateRange = dates.length > 0 
    ? `${dates[0]} to ${dates[dates.length - 1]}`
    : 'Unknown'
  
  return `
Currency: ${currency}
Date Range: ${dateRange}
Total Transactions: ${transactions.length}
Total Expenses: ${currency} ${totalExpenses.toFixed(2)} (${expenses.length} transactions)
Total Income: ${currency} ${totalIncome.toFixed(2)} (${income.length} transactions)
Net: ${currency} ${(totalIncome - totalExpenses).toFixed(2)}

Spending by Category:
${Object.entries(byCategory)
  .sort(([, a], [, b]) => b.total - a.total)
  .map(([cat, { count, total }]) => `  - ${cat}: ${currency} ${total.toFixed(2)} (${count} transactions)`)
  .join('\n')}

Monthly Breakdown:
${Object.entries(byMonth)
  .sort(([a], [b]) => b.localeCompare(a))
  .slice(0, 6)
  .map(([month, { expenses, income }]) => 
    `  - ${month}: Expenses ${currency} ${expenses.toFixed(2)}, Income ${currency} ${income.toFixed(2)}`)
  .join('\n')}

Top 10 Merchants:
${topMerchants
  .map(([merchant, amount]) => `  - ${merchant}: ${currency} ${amount.toFixed(2)}`)
  .join('\n')}
`
}
