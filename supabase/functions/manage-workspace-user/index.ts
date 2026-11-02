import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const roles = ['Super Admin', 'Space Admin', 'Author', 'Reviewer', 'Viewer'] as const
const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

type MemberInput = {
  id?: string
  name?: string
  email?: string
  department?: string
  role?: string
  space?: string
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function writeAudit(
  admin: ReturnType<typeof createClient>,
  actorId: string,
  action: string,
  targetId: string,
  target: string,
  details: Record<string, unknown> = {},
) {
  const { error } = await admin.from('audit_events').insert({
    actor_id: actorId,
    action,
    target_type: 'Access',
    target_id: targetId,
    details: { ...details, target },
  })
  return error?.message ?? null
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405)
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return response({ error: 'User management is not configured on the server.' }, 500)

  const authorization = request.headers.get('Authorization')
  if (!authorization) return response({ error: 'Sign in to manage workspace users.' }, 401)

  const sessionClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: authData, error: authError } = await sessionClient.auth.getUser()
  if (authError || !authData.user) return response({ error: 'Your session is invalid or expired.' }, 401)

  const { data: actor, error: actorError } = await admin.from('profiles').select('role, status').eq('id', authData.user.id).single()
  if (actorError || actor?.role !== 'Super Admin' || actor.status !== 'Active') return response({ error: 'Only an active Super Admin can manage workspace users.' }, 403)

  let input: { action?: string; member?: MemberInput; userId?: string; status?: string }
  try {
    input = await request.json()
  } catch {
    return response({ error: 'Provide a valid JSON request body.' }, 400)
  }

  if (input.action === 'invite') {
    const member = input.member ?? {}
    const email = member.email?.trim().toLowerCase() ?? ''
    const name = member.name?.trim() || email.split('@')[0]
    const department = member.department?.trim() ?? ''
    const role = member.role ?? 'Author'
    const space = member.space?.trim() || 'All spaces'
    if (!email || !email.includes('@')) return response({ error: 'Enter a valid work email.' }, 400)
    if (!roles.includes(role as typeof roles[number]) || role === 'Super Admin') return response({ error: 'Choose a permitted member role.' }, 400)

    let targetSpaceIds: string[] = []
    if (space !== 'All spaces') {
      const { data: spaceRow, error: spaceError } = await admin.from('spaces').select('id').eq('name', space).single()
      if (spaceError || !spaceRow) return response({ error: spaceError?.message ?? 'The selected space does not exist.' }, 400)
      targetSpaceIds = [spaceRow.id]
    } else if (role !== 'Super Admin') {
      const { data: allSpaces, error: spacesError } = await admin.from('spaces').select('id')
      if (spacesError) return response({ error: spacesError.message }, 500)
      targetSpaceIds = (allSpaces ?? []).map((spaceRow) => spaceRow.id)
    }

    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { data: { full_name: name } })
    if (inviteError || !inviteData.user) return response({ error: inviteError?.message ?? 'Supabase did not create an invitation.' }, 400)

    const { error: profileError } = await admin.from('profiles').upsert({
      id: inviteData.user.id,
      email,
      display_name: name,
      department,
      role,
      status: 'Invited',
    }, { onConflict: 'id' })
    if (profileError) {
      await admin.auth.admin.deleteUser(inviteData.user.id)
      return response({ error: profileError.message }, 500)
    }

    if (targetSpaceIds.length) {
      const { error: membershipError } = await admin.from('space_members').upsert(targetSpaceIds.map((space_id) => ({
        space_id,
        user_id: inviteData.user.id,
        role: role === 'Space Admin' ? 'Space Admin' : 'Member',
        added_by: authData.user.id,
      })), { onConflict: 'space_id,user_id' })
      if (membershipError) {
        await admin.auth.admin.deleteUser(inviteData.user.id)
        return response({ error: membershipError.message }, 500)
      }
    }

    const auditError = await writeAudit(admin, authData.user.id, 'Invited member', inviteData.user.id, `${name} (${email})`, { role, space })
    return response({ member: { id: inviteData.user.id, name, email, department, role, space, status: 'Invited' }, auditWarning: auditError })
  }

  if (input.action === 'update') {
    const member = input.member ?? {}
    if (!member.id || !member.name?.trim() || !member.email?.trim()) return response({ error: 'The member details are incomplete.' }, 400)
    if (!roles.includes(member.role as typeof roles[number])) return response({ error: 'Choose a valid role.' }, 400)

    const space = member.space?.trim() || 'All spaces'
    let targetSpaceIds: string[] = []
    if (space !== 'All spaces') {
      const { data: spaceRow, error: spaceError } = await admin.from('spaces').select('id').eq('name', space).single()
      if (spaceError || !spaceRow) return response({ error: spaceError?.message ?? 'The selected space does not exist.' }, 400)
      targetSpaceIds = [spaceRow.id]
    } else if (member.role !== 'Super Admin') {
      const { data: allSpaces, error: spacesError } = await admin.from('spaces').select('id')
      if (spacesError) return response({ error: spacesError.message }, 500)
      targetSpaceIds = (allSpaces ?? []).map((spaceRow) => spaceRow.id)
    }

    const { data: oldProfile, error: readError } = await admin.from('profiles').select('display_name, department, role').eq('id', member.id).single()
    if (readError || !oldProfile) return response({ error: readError?.message ?? 'Member not found.' }, 404)
    const { data: oldMemberships, error: membershipReadError } = await admin.from('space_members').select('space_id, user_id, role, added_by').eq('user_id', member.id)
    if (membershipReadError) return response({ error: membershipReadError.message }, 500)

    const { error: profileError } = await admin.from('profiles').update({
      display_name: member.name.trim(),
      department: member.department?.trim() ?? '',
      role: member.role,
    }).eq('id', member.id)
    if (profileError) return response({ error: profileError.message }, 500)

    const { error: membershipDeleteError } = await admin.from('space_members').delete().eq('user_id', member.id)
    let membershipError = membershipDeleteError
    if (!membershipError && targetSpaceIds.length) {
      const { error } = await admin.from('space_members').insert(targetSpaceIds.map((space_id) => ({
        space_id,
        user_id: member.id,
        role: member.role === 'Space Admin' ? 'Space Admin' : 'Member',
        added_by: authData.user.id,
      })))
      membershipError = error
    }
    if (membershipError) {
      await admin.from('profiles').update(oldProfile).eq('id', member.id)
      await admin.from('space_members').delete().eq('user_id', member.id)
      if (oldMemberships?.length) await admin.from('space_members').insert(oldMemberships)
      return response({ error: membershipError.message }, 500)
    }

    const target = `${member.name.trim()} (${member.email.trim()})`
    const auditError = await writeAudit(admin, authData.user.id, 'Updated member access', member.id, target, { role: member.role, space })
    return response({ member: { ...member, space }, auditWarning: auditError })
  }

  if (input.action === 'status') {
    const userId = input.userId
    const status = input.status
    if (!userId || (status !== 'Active' && status !== 'Suspended')) return response({ error: 'Choose Active or Suspended.' }, 400)
    if (userId === authData.user.id && status === 'Suspended') return response({ error: 'You cannot suspend your own account.' }, 400)

    const { data: target, error: targetError } = await admin.from('profiles').select('email, display_name, role').eq('id', userId).single()
    if (targetError || !target) return response({ error: targetError?.message ?? 'Member not found.' }, 404)
    const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, { ban_duration: status === 'Suspended' ? '876000h' : 'none' })
    if (authUpdateError) return response({ error: authUpdateError.message }, 500)
    const { error: profileError } = await admin.from('profiles').update({ status }).eq('id', userId)
    if (profileError) {
      await admin.auth.admin.updateUserById(userId, { ban_duration: status === 'Suspended' ? 'none' : '876000h' })
      return response({ error: profileError.message }, 500)
    }

    const targetLabel = `${target.display_name} (${target.email})`
    const auditError = await writeAudit(admin, authData.user.id, `${status === 'Suspended' ? 'Suspended' : 'Reactivated'} member`, userId, targetLabel, { status })
    return response({ auditWarning: auditError })
  }

  if (input.action === 'delete') {
    const userId = input.userId
    if (!userId) return response({ error: 'Member ID is required.' }, 400)
    if (userId === authData.user.id) return response({ error: 'You cannot delete your own account.' }, 400)
    const { data: target, error: targetError } = await admin.from('profiles').select('email, display_name').eq('id', userId).single()
    if (targetError || !target) return response({ error: targetError?.message ?? 'Member not found.' }, 404)

    const dependentRecords = await Promise.all([
      admin.from('articles').select('id').eq('author_id', userId).limit(1),
      admin.from('article_versions').select('id').eq('author_id', userId).limit(1),
      admin.from('article_comments').select('id').eq('author_id', userId).limit(1),
      admin.from('knowledge_questions').select('id').eq('author_id', userId).limit(1),
      admin.from('question_answers').select('id').eq('author_id', userId).limit(1),
      admin.from('knowledge_assets').select('id').eq('uploaded_by', userId).limit(1),
    ])
    const dependencyError = dependentRecords.find((result) => result.error)?.error
    if (dependencyError) return response({ error: dependencyError.message }, 500)
    if (dependentRecords.some((result) => result.data?.length)) {
      return response({ error: 'This member owns content that must be retained. Suspend the account instead of deleting it.' }, 409)
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId)
    if (deleteError) return response({ error: deleteError.message }, 500)
    const auditError = await writeAudit(admin, authData.user.id, 'Removed member', userId, `${target.display_name} (${target.email})`)
    return response({ auditWarning: auditError })
  }

  return response({ error: 'Unsupported user management action.' }, 400)
})