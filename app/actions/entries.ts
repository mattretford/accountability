'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { todayDate, validDate } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'

export async function setHabitCompletion(formData: FormData) {
  const habitId = String(formData.get('habitId') ?? '')
  const entryDate = validDate(String(formData.get('entryDate') ?? ''))
  const completed = formData.get('completed') === 'true'
  if (!habitId || !entryDate) return
  if (entryDate > todayDate()) {
    throw new Error('Future days cannot be marked complete.')
  }

  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) redirect('/login')

  const { data: habit } = await supabase
    .from('habits')
    .select('id')
    .eq('id', habitId)
    .eq('user_id', authData.user.id)
    .is('archived_at', null)
    .maybeSingle()

  if (!habit) throw new Error('Habit not found.')

  const { error } = await supabase.from('habit_entries').upsert(
    {
      habit_id: habit.id,
      entry_date: entryDate,
      completed,
    },
    { onConflict: 'habit_id,entry_date' },
  )

  if (error) throw new Error(`Could not update habit: ${error.message}`)
  revalidatePath('/')
}
