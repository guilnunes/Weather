// Deletes the calling person's account. Their entries and settings go with it
// (the tables reference auth.users with ON DELETE CASCADE).
//
// Auth is checked here rather than by the gateway: the caller's access token
// is verified with Supabase Auth, and only that same user is deleted.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Not signed in' }, 401)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return json({ error: 'Not signed in' }, 401)

  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id)
  if (deleteError) return json({ error: 'Could not delete the account' }, 500)

  return json({ deleted: true })
})
