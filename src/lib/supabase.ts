import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Article, ArticleComment, ArticleVersion, AuditEvent, KnowledgeAsset, KnowledgeIntegration, KnowledgeModel, KnowledgeQuestion, KnowledgeSpace, Role, WorkspaceSettings, WorkspaceUser } from '../types'

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

export interface WorkspaceData {
  articles: Article[]
  questions: KnowledgeQuestion[]
  spaces: KnowledgeSpace[]
  assets: KnowledgeAsset[]
  models: KnowledgeModel[]
  integrations: KnowledgeIntegration[]
  taxonomyTerms: string[]
  bookmarks: string[]
  zeroResultQueries: string[]
  settings: WorkspaceSettings
}

const defaultWorkspaceSettings: WorkspaceSettings = {
  reviewRequired: true,
  reviewCadenceMonths: 6,
  notifyOwners: true,
  allowGuestQuestions: true,
  defaultArticleVisibility: 'Space members',
}

function displayDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'Not scheduled'
}

function relativeDate(value: string) {
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return displayDate(value)
}

function initialsFor(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

function assetSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function loadWorkspaceData(role: Role) {
  if (!supabase) return { data: null, error: 'Supabase is not configured.' }
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return { data: null, error: authError?.message ?? 'Sign in to load workspace data.' }

  const integrationsQuery = role === 'Super Admin' || role === 'Space Admin'
    ? supabase.from('knowledge_integrations').select('id, name, description, category, connected, last_synced_at').order('created_at', { ascending: false })
    : Promise.resolve({ data: [], error: null })
  const searchQueriesQuery = role === 'Super Admin' || role === 'Space Admin'
    ? supabase.from('search_queries').select('query, result_count, created_at').eq('result_count', 0).order('created_at', { ascending: false }).limit(50)
    : Promise.resolve({ data: [], error: null })

  const [spacesResult, categoriesResult, articlesResult, commentsResult, versionsResult, questionsResult, answersResult, assetsResult, modelsResult, integrationsResult, taxonomyResult, bookmarksResult, settingsResult, searchQueriesResult, profilesResult] = await Promise.all([
    supabase.from('spaces').select('id, name, description, color, owner_id, parent_id').order('name'),
    supabase.from('categories').select('id, space_id, name, parent_id').order('name'),
    supabase.from('articles').select('id, space_id, category_id, title, summary, body, status, owner_id, author_id, tags, view_count, review_due_at, updated_at').order('updated_at', { ascending: false }),
    supabase.from('article_comments').select('id, article_id, author_id, body, created_at').order('created_at'),
    supabase.from('article_versions').select('id, article_id, title, body, status, author_id, created_at').order('created_at', { ascending: false }),
    supabase.from('knowledge_questions').select('id, space_id, author_id, title, body, tags, accepted_answer_id, created_at').order('created_at', { ascending: false }),
    supabase.from('question_answers').select('id, question_id, author_id, body, verified_by, created_at').order('created_at'),
    supabase.from('knowledge_assets').select('id, space_id, name, kind, storage_path, byte_size, status, created_at').order('created_at', { ascending: false }),
    supabase.from('knowledge_models').select('id, name, format, description, owner_id, audience, coverage, status, use_cases').order('name'),
    integrationsQuery,
    supabase.from('taxonomy_terms').select('name').order('name'),
    supabase.from('bookmarks').select('article_id').eq('user_id', authData.user.id),
    supabase.from('workspace_settings').select('key, value'),
    searchQueriesQuery,
    supabase.from('profiles').select('id, display_name'),
  ])

  const results = [spacesResult, categoriesResult, articlesResult, commentsResult, versionsResult, questionsResult, answersResult, assetsResult, modelsResult, integrationsResult, taxonomyResult, bookmarksResult, settingsResult, searchQueriesResult, profilesResult]
  const queryError = results.find((result) => result.error)?.error
  if (queryError) return { data: null, error: queryError.message }

  const profilesById = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.display_name || 'Workspace member']))
  const spacesById = new Map((spacesResult.data ?? []).map((space) => [space.id, space]))
  const categoriesById = new Map((categoriesResult.data ?? []).map((category) => [category.id, category.name]))
  const categoriesBySpace = new Map<string, string[]>()
  for (const category of categoriesResult.data ?? []) {
    if (category.parent_id) continue
    categoriesBySpace.set(category.space_id, [...(categoriesBySpace.get(category.space_id) ?? []), category.name])
  }
  const childrenBySpace = new Map<string, string[]>()
  for (const space of spacesResult.data ?? []) {
    if (!space.parent_id) continue
    childrenBySpace.set(space.parent_id, [...(childrenBySpace.get(space.parent_id) ?? []), space.name])
  }

  const commentsByArticle = new Map<string, ArticleComment[]>()
  for (const comment of commentsResult.data ?? []) {
    commentsByArticle.set(comment.article_id, [...(commentsByArticle.get(comment.article_id) ?? []), {
      id: comment.id,
      author: profilesById.get(comment.author_id) ?? 'Workspace member',
      body: comment.body,
      createdAt: relativeDate(comment.created_at),
    }])
  }
  const versionsByArticle = new Map<string, ArticleVersion[]>()
  for (const version of versionsResult.data ?? []) {
    versionsByArticle.set(version.article_id, [...(versionsByArticle.get(version.article_id) ?? []), {
      id: version.id,
      title: version.title,
      body: version.body,
      status: version.status as ArticleVersion['status'],
      author: profilesById.get(version.author_id) ?? 'Workspace member',
      savedAt: displayDate(version.created_at),
    }])
  }

  const articles: Article[] = (articlesResult.data ?? []).map((article) => {
    const space = spacesById.get(article.space_id)
    const owner = profilesById.get(article.owner_id ?? article.author_id) ?? 'Workspace member'
    return {
      id: article.id,
      title: article.title,
      summary: article.summary,
      body: article.body,
      space: space?.name ?? 'Unknown space',
      category: article.category_id ? categoriesById.get(article.category_id) ?? 'Uncategorized' : 'Uncategorized',
      owner,
      updated: relativeDate(article.updated_at),
      status: article.status as Article['status'],
      views: String(article.view_count),
      tags: article.tags ?? [],
      initials: initialsFor(owner),
      color: space?.color ?? 'green',
      reviewDue: displayDate(article.review_due_at),
      comments: commentsByArticle.get(article.id) ?? [],
      versions: versionsByArticle.get(article.id) ?? [],
    }
  })

  const answersByQuestion = new Map<string, KnowledgeQuestion['answers']>()
  for (const answer of answersResult.data ?? []) {
    answersByQuestion.set(answer.question_id, [...(answersByQuestion.get(answer.question_id) ?? []), {
      id: answer.id,
      author: profilesById.get(answer.author_id) ?? 'Workspace member',
      body: answer.body,
      votes: 0,
      verified: Boolean(answer.verified_by),
    }])
  }
  const questions: KnowledgeQuestion[] = (questionsResult.data ?? []).map((question) => ({
    id: question.id,
    title: question.title,
    body: question.body,
    space: spacesById.get(question.space_id)?.name ?? 'Unknown space',
    tags: question.tags ?? [],
    author: profilesById.get(question.author_id) ?? 'Workspace member',
    createdAt: relativeDate(question.created_at),
    votes: 0,
    answers: (answersByQuestion.get(question.id) ?? []).map((answer) => ({ ...answer, verified: answer.verified || answer.id === question.accepted_answer_id })),
    acceptedAnswerId: question.accepted_answer_id ?? undefined,
  }))

  const spaces: KnowledgeSpace[] = (spacesResult.data ?? []).filter((space) => !space.parent_id).map((space) => ({
    name: space.name,
    description: space.description,
    color: space.color,
    articleCount: articles.filter((article) => article.space === space.name).length,
    owner: profilesById.get(space.owner_id) ?? 'Space owner',
    categories: categoriesBySpace.get(space.id) ?? [],
    children: childrenBySpace.get(space.id),
  }))

  const assets: KnowledgeAsset[] = (assetsResult.data ?? []).map((asset) => ({
    id: asset.id,
    name: asset.name,
    kind: asset.kind as KnowledgeAsset['kind'],
    space: spacesById.get(asset.space_id)?.name ?? 'Unknown space',
    size: assetSize(asset.byte_size),
    updated: relativeDate(asset.created_at),
    status: asset.status as KnowledgeAsset['status'],
    storagePath: asset.storage_path,
  }))

  const models: KnowledgeModel[] = (modelsResult.data ?? []).map((model) => ({
    id: model.id,
    name: model.name,
    format: model.format as KnowledgeModel['format'],
    description: model.description,
    owner: model.owner_id ? profilesById.get(model.owner_id) ?? 'Workspace member' : 'Workspace team',
    audience: model.audience,
    coverage: model.coverage,
    status: model.status as KnowledgeModel['status'],
    useCases: model.use_cases ?? [],
  }))

  const integrations: KnowledgeIntegration[] = (integrationsResult.data ?? []).map((integration) => ({
    id: integration.id,
    name: integration.name,
    description: integration.description,
    category: integration.category as KnowledgeIntegration['category'],
    connected: integration.connected,
    lastSynced: integration.last_synced_at ? relativeDate(integration.last_synced_at) : 'Never',
  }))

  const storedSettings = (settingsResult.data ?? []).find((item) => item.key === 'workspace')?.value as Partial<WorkspaceSettings> | undefined
  const data: WorkspaceData = {
    articles,
    questions,
    spaces,
    assets,
    models,
    integrations,
    taxonomyTerms: (taxonomyResult.data ?? []).map((term) => term.name),
    bookmarks: (bookmarksResult.data ?? []).map((bookmark) => bookmark.article_id),
    zeroResultQueries: (searchQueriesResult.data ?? []).map((query) => query.query),
    settings: { ...defaultWorkspaceSettings, ...storedSettings },
  }
  return { data, error: null }
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
