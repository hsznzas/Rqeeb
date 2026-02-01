/**
 * Vercel Cron Job: Process Recurring Income
 * 
 * Runs daily to automatically create transactions for recurring income
 * that is due today or overdue.
 * 
 * Schedule: Daily at 6:00 AM UTC
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Create Supabase admin client (uses service role key for bypassing RLS)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET and POST for cron
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify cron secret for security (optional but recommended)
  const cronSecret = req.headers['x-vercel-cron-secret'] || req.headers.authorization
  const expectedSecret = process.env.CRON_SECRET

  // If CRON_SECRET is set, verify it
  if (expectedSecret && cronSecret !== expectedSecret && cronSecret !== `Bearer ${expectedSecret}`) {
    console.log('Cron authentication failed')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const today = new Date().toISOString().split('T')[0]
    console.log(`Processing recurring income for ${today}`)

    // Fetch all active recurring income that is due today or earlier
    const { data: dueIncome, error: fetchError } = await supabase
      .from('recurring_income')
      .select('*')
      .eq('is_active', true)
      .lte('next_credit_date', today)

    if (fetchError) {
      console.error('Error fetching recurring income:', fetchError)
      return res.status(500).json({ error: 'Failed to fetch recurring income', details: fetchError.message })
    }

    if (!dueIncome || dueIncome.length === 0) {
      console.log('No recurring income due today')
      return res.status(200).json({ message: 'No recurring income due', processed: 0 })
    }

    console.log(`Found ${dueIncome.length} recurring income entries due`)

    let processedCount = 0
    const errors: string[] = []

    for (const income of dueIncome) {
      try {
        // Create the transaction
        const { error: insertError } = await supabase
          .from('transactions')
          .insert({
            user_id: income.user_id,
            amount: income.amount,
            currency: income.currency,
            direction: 'in',
            category: income.category || 'Income',
            merchant: income.name,
            description: income.description || `Recurring: ${income.name}`,
            transaction_date: income.next_credit_date,
            account_id: income.account_id,
            card_id: income.card_id
          })

        if (insertError) {
          console.error(`Error creating transaction for income ${income.id}:`, insertError)
          errors.push(`Income ${income.id}: ${insertError.message}`)
          continue
        }

        // Calculate next credit date
        const nextDate = calculateNextCreditDate(income.credit_day, income.next_credit_date)

        // Update the recurring income record
        const { error: updateError } = await supabase
          .from('recurring_income')
          .update({
            last_credit_date: income.next_credit_date,
            next_credit_date: nextDate,
            updated_at: new Date().toISOString()
          })
          .eq('id', income.id)

        if (updateError) {
          console.error(`Error updating recurring income ${income.id}:`, updateError)
          errors.push(`Update ${income.id}: ${updateError.message}`)
        } else {
          processedCount++
          console.log(`Processed recurring income ${income.id}: ${income.name}`)
        }
      } catch (err) {
        console.error(`Error processing income ${income.id}:`, err)
        errors.push(`Income ${income.id}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    const response = {
      message: `Processed ${processedCount} recurring income entries`,
      processed: processedCount,
      total: dueIncome.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    }

    console.log('Cron job completed:', response)
    return res.status(200).json(response)

  } catch (error) {
    console.error('Cron job error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Calculate the next credit date based on credit day
 */
function calculateNextCreditDate(creditDay: number, fromDate: string): string {
  const current = new Date(fromDate)
  
  // Move to next month
  let year = current.getFullYear()
  let month = current.getMonth() + 1
  
  if (month > 11) {
    month = 0
    year++
  }
  
  // Handle months with fewer days (e.g., Feb 30 -> Feb 28)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const day = Math.min(creditDay, daysInMonth)
  
  const nextDate = new Date(year, month, day)
  return nextDate.toISOString().split('T')[0]
}
