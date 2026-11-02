import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AuditEvent, WorkspaceUser } from '../types'

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

export interface WorkspaceAdminData {
  users: WorkspaceUser[]
  events: AuditEvent[]
  spaces: string[]
}

export async function loadWorkspaceAdminData() {
  if (!supabase) return { data: null, error: 'Supabase is not configured.' }

  const [profilesResult, membershipsResult, spacesResult, eventsResult] = await Promise.all([
    supabase.from('profiles').select('id, email, display_name, department, role, status').order('display_name'),
    supabase.from('space_members').select('user_id, space_id, created_at').order('created_at'),
    supabase.from('spaces').select('id, name').order('name'),
    supabase.from('audit_events').select('id, actor_id, action, target_type, target_id, details, created_at').order('created_at', { ascending: false }).limit(200),
  ])

  const queryError = profilesResult.error ?? membershipsResult.error ?? spacesResult.error ?? eventsResult.error
  if (queryError) return { data: null, error: queryError.message }

  const spacesById = new Map((spacesResult.data ?? []).map((space) => [space.id, space.name]))
  const membershipsByUser = new Map<string, string[]>()
  for (const membership of membershipsResult.data ?? []) {
    const spaceName = spacesById.get(membership.space_id)
    if (!spaceName) continue
    membershipsByUser.set(membership.user_id, [...(membershipsByUser.get(membership.user_id) ?? []), spaceName])
  }

  const profilesById = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]))
  const users: WorkspaceUser[] = (profilesResult.data ?? []).map((profile) => ({
    id: profile.id,
    name: profile.display_name || profile.email.split('@')[0],
    email: profile.email,
    department: profile.department,
    role: profile.role as WorkspaceUser['role'],
    status: profile.status as WorkspaceUser['status'],
    space: membershipsByUser.get(profile.id)?.[0] ?? 'All spaces',
  }))

  const events: AuditEvent[] = (eventsResult.data ?? []).map((event) => {
    const details = event.details as { target?: string } | null
    const eventType = event.target_type === 'Content' || event.target_type === 'Access' ? event.target_type : 'Workspace'
    return {
      id: event.id,
      actor: event.actor_id ? profilesById.get(event.actor_id)?.display_name || 'Workspace member' : 'System',
      action: event.action,
      target: details?.target || event.target_id,
      date: new Date(event.created_at).toLocaleString(),
      type: eventType,
    }
  })

  return { data: { users, events, spaces: (spacesResult.data ?? []).map((space) => space.name) } satisfies WorkspaceAdminData, error: null }
}

export async function manageWorkspaceUser(
  action: 'invite' | 'update' | 'status' | 'delete',
  payload: { member?: Partial<WorkspaceUser>; userId?: string; status?: WorkspaceUser['status'] },
) {
  if (!supabase) return { data: null, error: 'Supabase is not configured.' }
  const { data, error } = await supabase.functions.invoke('manage-workspace-user', { body: { action, ...payload } })
  return { data, error: error?.message ?? null }
}

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

export async function getCurrentWorkspaceRole() {
  if (!supabase) {
    return {
      role: null,
      error: 'Supabase is not configured.',
    }
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return { role: null, error: userError?.message ?? 'No authenticated user.' }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()

  if (error) return { role: null, error: error.message }
  return { role: data.role as string, error: null }
}

function fileSizeLabel(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function uploadKnowledgeFile(file: File, spaceName: string, kind: string) {
  if (!supabase) {
    return { data: null, error: 'Supabase is not configured. Set its URL and publishable key first.' }
  }
  if (file.size > 100 * 1024 * 1024) {
    return { data: null, error: 'Files must be 100 MB or smaller.' }
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return { data: null, error: userError?.message ?? 'Sign in before uploading a file.' }
  }

  const slug = spaceName.toLowerCase().replace(/&/g, ' ').trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const { data: space, error: spaceError } = await supabase
    .from('spaces')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()
  if (spaceError || !space) {
    return { data: null, error: spaceError?.message ?? `Space "${spaceName}" was not found in Supabase.` }
  }

  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')
  const filePath = `${space.slug}/${userData.user.id}/${crypto.randomUUID()}-${safeFileName}`
  const { error: uploadError } = await supabase.storage.from(supabaseBucket).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'application/octet-stream',
  })

  if (uploadError) {
    return { data: null, error: uploadError.message }
  }

  const { data, error: metadataError } = await supabase
    .from('knowledge_assets')
    .insert({
      space_id: space.id,
      uploaded_by: userData.user.id,
      name: file.name,
      kind,
      storage_path: filePath,
      mime_type: file.type || 'application/octet-stream',
      byte_size: file.size,
      status: 'Processing',
    })
    .select('id, name, kind, status, created_at')
    .single()

  if (metadataError) {
    await supabase.storage.from(supabaseBucket).remove([filePath])
    return { data: null, error: metadataError.message }
  }

  return {
    data: {
      id: data.id,
      name: data.name,
      kind: data.kind,
      space: space.name,
      size: fileSizeLabel(file.size),
      updated: 'Just now',
      status: data.status,
      storagePath: filePath,
    },
    error: null,
  }
}

export async function createKnowledgeAssetUrl(storagePath: string, expiresIn = 3600) {
  if (!supabase) return { url: null, error: 'Supabase is not configured.' }
  const { data, error } = await supabase.storage.from(supabaseBucket).createSignedUrl(storagePath, expiresIn)
  return { url: data?.signedUrl ?? null, error: error?.message ?? null }
}
