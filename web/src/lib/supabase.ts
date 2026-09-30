// The Supabase project behind accounts and sync (project "weather", São Paulo).

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isMoodKey } from './moods'
import type { Entry, Remote, Settings } from './store'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const isConfigured = Boolean(url && key)

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(url!, key!, {
      auth: {
        // PKCE sends the sign-in result back as ?code=… in the query string,
        // which keeps the #/ page routes free for the app.
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

/** Where Google and the email links send people back to: this page, without #/route. */
export function redirectUrl(): string {
  return `${location.origin}${location.pathname}`
}

/** Which sign-in methods the project has switched on (e.g. Google). */
export async function fetchAuthSettings(): Promise<{ google: boolean; emailConfirm: boolean } | null> {
  if (!isConfigured) return null
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key! } })
    if (!res.ok) return null
    const data = await res.json()
    return { google: Boolean(data?.external?.google), emailConfirm: !data?.mailer_autoconfirm }
  } catch {
    return null
  }
}

interface EntryRow {
  id: string
  mood: string
  created_at: string
  updated_at: string
  note: string
}

const toRow = (e: Entry, userId: string) => ({
  id: e.id,
  user_id: userId,
  mood: e.mood,
  created_at: new Date(e.createdAt).toISOString(),
  updated_at: new Date(e.updatedAt).toISOString(),
  note: e.note,
})

const fromRow = (r: EntryRow): Entry | null =>
  isMoodKey(r.mood)
    ? {
        id: r.id,
        mood: r.mood,
        createdAt: Date.parse(r.created_at),
        updatedAt: Date.parse(r.updated_at),
        note: r.note ?? '',
      }
    : null

const PAGE = 1000

/** The signed-in person's rows. Row-level security limits every query to them. */
export function supabaseRemote(client: SupabaseClient, userId: string): Remote {
  const fail = (error: unknown) => {
    if (error) throw error
  }
  return {
    async pull() {
      const entries: Entry[] = []
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await client
          .from('entries')
          .select('id, mood, created_at, updated_at, note')
          .order('created_at', { ascending: false })
          .range(from, from + PAGE - 1)
        fail(error)
        const rows = (data ?? []) as EntryRow[]
        rows.forEach((r) => {
          const e = fromRow(r)
          if (e) entries.push(e)
        })
        if (rows.length < PAGE) break
      }
      const { data: s, error } = await client.from('user_settings').select('hold_hours').maybeSingle()
      fail(error)
      const settings: Settings | null = s ? { holdHours: s.hold_hours } : null
      return { entries, settings }
    },
    async upsert(entries) {
      const { error } = await client.from('entries').upsert(entries.map((e) => toRow(e, userId)))
      fail(error)
    },
    async remove(ids) {
      const { error } = await client.from('entries').delete().in('id', ids)
      fail(error)
    },
    async removeAll() {
      const { error } = await client.from('entries').delete().eq('user_id', userId)
      fail(error)
    },
    async saveSettings(settings) {
      const { error } = await client
        .from('user_settings')
        .upsert({ user_id: userId, hold_hours: settings.holdHours, updated_at: new Date().toISOString() })
      fail(error)
    },
  }
}
