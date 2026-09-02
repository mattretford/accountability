'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { shiftMonth, validMonth } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'

async function authenticatedClient() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) redirect('/login')
  return { supabase, user: data.user }
}

function taskMonth(formData: FormData) {
  const month = validMonth(String(formData.get('month') ?? ''))
  return month ? `${month}-01` : null
}

export async function createMonthlyTask(formData: FormData) {
  const month = taskMonth(formData)
  const title = String(formData.get('title') ?? '').trim()
  if (!month || !title || title.length > 200) return

  const { supabase, user } = await authenticatedClient()
  const { error } = await supabase.from('monthly_tasks').insert({
    user_id: user.id,
    task_month: month,
    title,
  })

  if (error) throw new Error(`Could not create monthly task: ${error.message}`)
  revalidatePath('/calendar')
}

export async function setMonthlyTaskCompletion(formData: FormData) {
  const month = taskMonth(formData)
  const id = String(formData.get('id') ?? '')
  const completed = formData.get('completed') === 'true'
  if (!month || !id) return

  const { supabase, user } = await authenticatedClient()
  const { error } = await supabase
    .from('monthly_tasks')
    .update({ completed })
    .eq('id', id)
    .eq('task_month', month)
    .eq('user_id', user.id)
    .is('archived_at', null)

  if (error) throw new Error(`Could not update monthly task: ${error.message}`)
  revalidatePath('/calendar')
}

export async function archiveMonthlyTask(formData: FormData) {
  const month = taskMonth(formData)
  const id = String(formData.get('id') ?? '')
  if (!month || !id) return

  const { supabase, user } = await authenticatedClient()
  const { error } = await supabase
    .from('monthly_tasks')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('task_month', month)
    .eq('user_id', user.id)

  if (error) throw new Error(`Could not archive monthly task: ${error.message}`)
  revalidatePath('/calendar')
}

export async function copyMonthlyTaskToNextMonth(formData: FormData) {
  const sourceMonth = validMonth(String(formData.get('month') ?? ''))
  const id = String(formData.get('id') ?? '')
  if (!sourceMonth || !id) return

  const { supabase, user } = await authenticatedClient()
  const { data: sourceTask, error: sourceError } = await supabase
    .from('monthly_tasks')
    .select('title')
    .eq('id', id)
    .eq('task_month', `${sourceMonth}-01`)
    .eq('user_id', user.id)
    .is('archived_at', null)
    .maybeSingle()

  if (sourceError || !sourceTask) {
    throw new Error('Could not find the monthly task to copy.')
  }

  const { error } = await supabase.from('monthly_tasks').insert({
    user_id: user.id,
    task_month: `${shiftMonth(sourceMonth, 1)}-01`,
    title: sourceTask.title,
    completed: false,
  })

  if (error) throw new Error(`Could not copy monthly task: ${error.message}`)
  revalidatePath('/calendar')
}
