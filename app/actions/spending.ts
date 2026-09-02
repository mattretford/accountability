'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { todayDate, validDate } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'

const GBP_AMOUNT = /^\d{1,10}(?:\.\d{1,2})?$/

export async function setDailySpending(formData: FormData) {
  const spendDate = validDate(String(formData.get('spendDate') ?? ''))
  const amountText = String(formData.get('amount') ?? '').trim()

  if (!spendDate || !GBP_AMOUNT.test(amountText)) {
    throw new Error('Enter a valid amount with no more than two decimal places.')
  }
  if (spendDate > todayDate()) {
    throw new Error('Spending cannot be recorded for a future day.')
  }

  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) redirect('/login')

  const { error } = await supabase.from('daily_spending').upsert(
    {
      user_id: authData.user.id,
      spend_date: spendDate,
      amount: Number(amountText),
    },
    { onConflict: 'user_id,spend_date' },
  )

  if (error) throw new Error(`Could not save spending: ${error.message}`)
  revalidatePath('/')
  revalidatePath('/calendar')
}
