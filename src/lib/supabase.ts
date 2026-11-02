import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
const supabaseBucket = import.meta.env.VITE_SUPABASE_BUCKET ?? 'knowledge-assets'

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export async function signInWithEmail(email: string, password: string) {
  if (!email.trim() || !password.trim()) {
    return { data: null, error: 'Enter your work email and password.' }
  }

  if (!supabase) {
    return { data: null, error: 'Sign-in is unavailable. Configure Supabase to continue.' }
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function resetPassword(email: string) {
  if (!email.trim()) {
    return { data: null, error: 'A valid email address is required.' }
  }

  if (!supabase) {
    return { data: null, error: 'Password reset is unavailable. Configure Supabase first.' }
  }

  const redirectUrl = new URL(window.location.origin)
  redirectUrl.searchParams.set('auth', 'login')
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl.toString(),
  })

  if (error) {
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

export async function signOut() {
  if (!supabase) return { error: null }

  const { error } = await supabase.auth.signOut()
  return { error: error?.message ?? null }
}

export async function uploadKnowledgeFile(file: File, path?: string) {
  if (!supabase) {
    return {
      data: null,
      error: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable uploads.',
    }
  }

  const filePath = path ?? `${Date.now()}-${file.name.replace(/\s+/g, '-')}`
  const { data, error } = await supabase.storage.from(supabaseBucket).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  })

  if (error) {
    return { data: null, error: error.message }
  }

  const { data: publicUrlData } = supabase.storage.from(supabaseBucket).getPublicUrl(filePath)

  return {
    data: {
      ...data,
      publicUrl: publicUrlData.publicUrl,
    },
    error: null,
  }
}
