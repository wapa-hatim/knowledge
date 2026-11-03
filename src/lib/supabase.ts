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
  currentUserName: string
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

function mapWorkspaceMembers(data: unknown) {
  const records = (data ?? []) as { id: string; display_name: string | null }[]
  return new Map<string, string>(records.map((profile) => [profile.id, profile.display_name || 'Workspace member']))
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

  const [spacesResult, categoriesResult, articlesResult, commentsResult, versionsResult, questionsResult, answersResult, assetsResult, modelsResult, integrationsResult, taxonomyResult, bookmarksResult, settingsResult, searchQueriesResult, profilesResult, voteCountsResult, questionVotesResult, answerVotesResult] = await Promise.all([
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
    supabase.rpc('get_workspace_member_directory'),
    supabase.rpc('get_workspace_vote_counts'),
    supabase.from('question_votes').select('question_id').eq('user_id', authData.user.id),
    supabase.from('answer_votes').select('answer_id').eq('user_id', authData.user.id),
  ])

  const results = [spacesResult, categoriesResult, articlesResult, commentsResult, versionsResult, questionsResult, answersResult, assetsResult, modelsResult, integrationsResult, taxonomyResult, bookmarksResult, settingsResult, searchQueriesResult, profilesResult, voteCountsResult, questionVotesResult, answerVotesResult]
  const queryError = results.find((result) => result.error)?.error
  if (queryError) return { data: null, error: queryError.message }

  const profilesById = mapWorkspaceMembers(profilesResult.data)
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

  const voteCountRows = (voteCountsResult.data ?? []) as { vote_type: string; target_id: string; vote_count: number | string }[]
  const voteCounts = new Map<string, number>(voteCountRows.map((vote) => [`${vote.vote_type}:${vote.target_id}`, Number(vote.vote_count)]))
  const questionVotesByMe = new Set((questionVotesResult.data ?? []).map((vote) => vote.question_id))
  const answerVotesByMe = new Set((answerVotesResult.data ?? []).map((vote) => vote.answer_id))

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
      votes: voteCounts.get(`answer:${answer.id}`) ?? 0,
      votedByMe: answerVotesByMe.has(answer.id),
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
    votes: voteCounts.get(`question:${question.id}`) ?? 0,
    votedByMe: questionVotesByMe.has(question.id),
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
    currentUserName: profilesById.get(authData.user.id) ?? authData.user.email?.split('@')[0] ?? 'Workspace member',
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

export async function loadCoreWorkspaceData(userId: string) {
  if (!supabase) return { data: null, error: 'Supabase is not configured.' }

  const [spacesResult, categoriesResult, articlesResult, bookmarksResult, profilesResult, eventsResult] = await Promise.all([
    supabase.from('spaces').select('id, name, description, color, owner_id, parent_id').order('name'),
    supabase.from('categories').select('id, space_id, name, parent_id').order('name'),
    supabase.from('articles').select('id, space_id, category_id, title, summary, status, owner_id, author_id, tags, view_count, review_due_at, updated_at').order('updated_at', { ascending: false }).limit(1000),
    supabase.from('bookmarks').select('article_id').eq('user_id', userId),
    supabase.rpc('get_workspace_member_directory'),
    supabase.from('audit_events').select('id, actor_id, action, target_type, target_id, details, created_at').order('created_at', { ascending: false }).limit(5),
  ])
  const error = spacesResult.error ?? categoriesResult.error ?? articlesResult.error ?? bookmarksResult.error ?? profilesResult.error ?? eventsResult.error
  if (error) return { data: null, error: error.message }

  const profilesById = mapWorkspaceMembers(profilesResult.data)
  const spacesById = new Map((spacesResult.data ?? []).map((space) => [space.id, space]))
  const categoryNames = new Map<string, string[]>()
  const categoriesById = new Map((categoriesResult.data ?? []).map((category) => [category.id, category.name]))
  const childrenBySpace = new Map<string, string[]>()
  for (const category of categoriesResult.data ?? []) {
    if (!category.parent_id) categoryNames.set(category.space_id, [...(categoryNames.get(category.space_id) ?? []), category.name])
  }
  for (const space of spacesResult.data ?? []) {
    if (space.parent_id) childrenBySpace.set(space.parent_id, [...(childrenBySpace.get(space.parent_id) ?? []), space.name])
  }

  const articles: Article[] = (articlesResult.data ?? []).map((article) => {
    const space = spacesById.get(article.space_id)
    const owner = profilesById.get(article.owner_id ?? article.author_id) ?? 'Workspace member'
    return {
      id: article.id,
      title: article.title,
      summary: article.summary,
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
      comments: [],
      versions: [],
    }
  })

  const spaces: KnowledgeSpace[] = (spacesResult.data ?? []).filter((space) => !space.parent_id).map((space) => ({
    name: space.name,
    description: space.description,
    color: space.color,
    articleCount: articles.filter((article) => article.space === space.name).length,
    owner: profilesById.get(space.owner_id) ?? 'Space owner',
    categories: categoryNames.get(space.id) ?? [],
    children: childrenBySpace.get(space.id),
  }))

  const events: AuditEvent[] = (eventsResult.data ?? []).map((event) => ({
    id: event.id,
    actor: profilesById.get(event.actor_id) ?? 'Workspace member',
    action: event.action,
    target: (event.details as { target?: string } | null)?.target ?? event.target_id,
    date: relativeDate(event.created_at),
    type: (event.target_type === 'Content' || event.target_type === 'Access' ? event.target_type : 'Workspace') as AuditEvent['type'],
  }))

  return {
    data: {
      currentUserName: profilesById.get(userId) ?? 'Workspace member',
      articles,
      spaces,
      bookmarks: (bookmarksResult.data ?? []).map((bookmark) => bookmark.article_id),
      events,
    },
    error: null,
  }
}

export async function loadArticleDetails(articleId: string) {
  if (!supabase) return { data: null, error: 'Supabase is not configured.' }
  const [articleResult, commentsResult, versionsResult, profilesResult] = await Promise.all([
    supabase.from('articles').select('body').eq('id', articleId).single(),
    supabase.from('article_comments').select('id, author_id, body, created_at').eq('article_id', articleId).order('created_at'),
    supabase.from('article_versions').select('id, title, body, status, author_id, created_at').eq('article_id', articleId).order('created_at', { ascending: false }),
    supabase.rpc('get_workspace_member_directory'),
  ])
  const error = articleResult.error ?? commentsResult.error ?? versionsResult.error ?? profilesResult.error
  if (error || !articleResult.data) return { data: null, error: error?.message ?? 'Could not load article body.' }
  const profiles = mapWorkspaceMembers(profilesResult.data)
  return {
    data: {
      body: articleResult.data.body,
      comments: (commentsResult.data ?? []).map((comment) => ({ id: comment.id, author: profiles.get(comment.author_id) ?? 'Workspace member', body: comment.body, createdAt: relativeDate(comment.created_at) })),
      versions: (versionsResult.data ?? []).map((version) => ({ id: version.id, title: version.title, body: version.body, status: version.status as ArticleVersion['status'], author: profiles.get(version.author_id) ?? 'Workspace member', savedAt: displayDate(version.created_at) })),
    },
    error: null,
  }
}

export async function loadQuestionData() {
  if (!supabase) return { data: null, error: 'Supabase is not configured.' }
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return { data: null, error: authError?.message ?? 'Sign in to load questions.' }
  const [spacesResult, questionsResult, answersResult, voteCountsResult, questionVotesResult, answerVotesResult, profilesResult] = await Promise.all([
    supabase.from('spaces').select('id, name'),
    supabase.from('knowledge_questions').select('id, space_id, author_id, title, body, tags, accepted_answer_id, created_at').order('created_at', { ascending: false }),
    supabase.from('question_answers').select('id, question_id, author_id, body, verified_by, created_at').order('created_at'),
    supabase.rpc('get_workspace_vote_counts'),
    supabase.from('question_votes').select('question_id').eq('user_id', authData.user.id),
    supabase.from('answer_votes').select('answer_id').eq('user_id', authData.user.id),
    supabase.rpc('get_workspace_member_directory'),
  ])
  const error = spacesResult.error ?? questionsResult.error ?? answersResult.error ?? voteCountsResult.error ?? questionVotesResult.error ?? answerVotesResult.error ?? profilesResult.error
  if (error) return { data: null, error: error.message }
  const spaces = new Map((spacesResult.data ?? []).map((space) => [space.id, space.name]))
  const profiles = mapWorkspaceMembers(profilesResult.data)
  const countRows = (voteCountsResult.data ?? []) as { vote_type: string; target_id: string; vote_count: number | string }[]
  const counts = new Map<string, number>(countRows.map((vote) => [`${vote.vote_type}:${vote.target_id}`, Number(vote.vote_count)]))
  const questionVotes = new Set((questionVotesResult.data ?? []).map((vote) => vote.question_id))
  const answerVotes = new Set((answerVotesResult.data ?? []).map((vote) => vote.answer_id))
  const answersByQuestion = new Map<string, KnowledgeQuestion['answers']>()
  for (const answer of answersResult.data ?? []) {
    answersByQuestion.set(answer.question_id, [...(answersByQuestion.get(answer.question_id) ?? []), {
      id: answer.id,
      author: profiles.get(answer.author_id) ?? 'Workspace member',
      body: answer.body,
      votes: counts.get(`answer:${answer.id}`) ?? 0,
      votedByMe: answerVotes.has(answer.id),
      verified: Boolean(answer.verified_by),
    }])
  }
  const questions: KnowledgeQuestion[] = (questionsResult.data ?? []).map((question) => ({
    id: question.id,
    title: question.title,
    body: question.body,
    space: spaces.get(question.space_id) ?? 'Unknown space',
    tags: question.tags ?? [],
    author: profiles.get(question.author_id) ?? 'Workspace member',
    createdAt: relativeDate(question.created_at),
    votes: counts.get(`question:${question.id}`) ?? 0,
    votedByMe: questionVotes.has(question.id),
    answers: (answersByQuestion.get(question.id) ?? []).map((answer) => ({ ...answer, verified: answer.verified || answer.id === question.accepted_answer_id })),
    acceptedAnswerId: question.accepted_answer_id ?? undefined,
  }))
  return { data: questions, error: null }
}

export async function loadKnowledgeHubData(role: Role) {
  if (!supabase) return { data: null, error: 'Supabase is not configured.' }
  const ownerProfiles = supabase.rpc('get_workspace_member_directory')
  const integrations = role === 'Super Admin' || role === 'Space Admin'
    ? supabase.from('knowledge_integrations').select('id, name, description, category, connected, last_synced_at').order('created_at', { ascending: false })
    : Promise.resolve({ data: [], error: null })
  const [spacesResult, assetsResult, modelsResult, integrationsResult, taxonomyResult, profilesResult] = await Promise.all([
    supabase.from('spaces').select('id, name'),
    supabase.from('knowledge_assets').select('id, space_id, name, kind, storage_path, byte_size, status, created_at').order('created_at', { ascending: false }),
    supabase.from('knowledge_models').select('id, name, format, description, owner_id, audience, coverage, status, use_cases').order('name'),
    integrations,
    supabase.from('taxonomy_terms').select('name').order('name'),
    ownerProfiles,
  ])
  const error = spacesResult.error ?? assetsResult.error ?? modelsResult.error ?? integrationsResult.error ?? taxonomyResult.error ?? profilesResult.error
  if (error) return { data: null, error: error.message }
  const spaces = new Map((spacesResult.data ?? []).map((space) => [space.id, space.name]))
  const profiles = mapWorkspaceMembers(profilesResult.data)
  return {
    data: {
      assets: (assetsResult.data ?? []).map((asset) => ({ id: asset.id, name: asset.name, kind: asset.kind as KnowledgeAsset['kind'], space: spaces.get(asset.space_id) ?? 'Unknown space', size: assetSize(asset.byte_size), updated: relativeDate(asset.created_at), status: asset.status as KnowledgeAsset['status'], storagePath: asset.storage_path })),
      models: (modelsResult.data ?? []).map((model) => ({ id: model.id, name: model.name, format: model.format as KnowledgeModel['format'], description: model.description, owner: model.owner_id ? profiles.get(model.owner_id) ?? 'Workspace member' : 'Workspace team', audience: model.audience, coverage: model.coverage, status: model.status as KnowledgeModel['status'], useCases: model.use_cases ?? [] })),
      integrations: (integrationsResult.data ?? []).map((item) => ({ id: item.id, name: item.name, description: item.description, category: item.category as KnowledgeIntegration['category'], connected: item.connected, lastSynced: item.last_synced_at ? relativeDate(item.last_synced_at) : 'Never' })),
      taxonomyTerms: (taxonomyResult.data ?? []).map((term) => term.name),
    },
    error: null,
  }
}

export async function loadWorkspaceSettings() {
  if (!supabase) return { data: null, error: 'Supabase is not configured.' }
  const { data, error } = await supabase.from('workspace_settings').select('value').eq('key', 'workspace').maybeSingle()
  if (error) return { data: null, error: error.message }
  return { data: { ...defaultWorkspaceSettings, ...(data?.value as Partial<WorkspaceSettings> | undefined) }, error: null }
}

export async function loadSearchGaps() {
  if (!supabase) return { data: null, error: 'Supabase is not configured.' }
  const { data, error } = await supabase.from('search_queries').select('query').eq('result_count', 0).order('created_at', { ascending: false }).limit(50)
  return { data: data?.map((row) => row.query) ?? null, error: error?.message ?? null }
}

async function getAuthenticatedUserId() {
  if (!supabase) return { id: null, error: 'Supabase is not configured.' }
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return { id: null, error: error?.message ?? 'Sign in to make workspace changes.' }
  return { id: data.user.id, error: null }
}

async function getSpaceId(name: string) {
  if (!supabase) return { id: null, error: 'Supabase is not configured.' }
  const { data, error } = await supabase.from('spaces').select('id').eq('name', name).single()
  return { id: data?.id ?? null, error: error?.message ?? null }
}

export async function saveArticleRecord(article: Article) {
  if (!supabase) return { error: 'Supabase is not configured.' }
  const { id: userId, error: userError } = await getAuthenticatedUserId()
  if (userError || !userId) return { error: userError }
  const { id: spaceId, error: spaceError } = await getSpaceId(article.space)
  if (spaceError || !spaceId) return { error: spaceError ?? 'Choose an existing space.' }
  let { data: category, error: categoryError } = await supabase.from('categories').select('id').eq('space_id', spaceId).eq('name', article.category).maybeSingle()
  if (categoryError) return { error: categoryError.message }
  if (!category && article.category && article.category !== 'Uncategorized') {
    const result = await supabase.from('categories').insert({ space_id: spaceId, name: article.category }).select('id').single()
    category = result.data
    categoryError = result.error
    if (categoryError) return { error: categoryError.message }
  }
  const record = {
    space_id: spaceId,
    category_id: category?.id ?? null,
    title: article.title,
    summary: article.summary,
    body: article.body ?? '',
    status: article.status,
    tags: article.tags,
    review_due_at: article.reviewDue && article.reviewDue !== 'Not scheduled' ? new Date(article.reviewDue).toISOString() : null,
    published_at: article.status === 'Published' ? new Date().toISOString() : null,
  }
  const { data: existing } = await supabase.from('articles').select('id').eq('id', article.id).maybeSingle()
  const result = existing
    ? await supabase.from('articles').update(record).eq('id', article.id)
    : await supabase.from('articles').insert({ ...record, author_id: userId, owner_id: userId })
  return { error: result.error?.message ?? null }
}

export async function saveArticleComment(articleId: string, body: string) {
  if (!supabase) return { error: 'Supabase is not configured.' }
  const { id: userId, error: userError } = await getAuthenticatedUserId()
  if (userError || !userId) return { error: userError }
  const { error } = await supabase.from('article_comments').insert({ article_id: articleId, author_id: userId, body })
  return { error: articleWriteError(error) }
}

export async function saveArticleFeedback(articleId: string, helpful: boolean, feedback = '') {
  if (!supabase) return { error: 'Supabase is not configured.' }
  const { id: userId, error: userError } = await getAuthenticatedUserId()
  if (userError || !userId) return { error: userError }
  const { error } = await supabase.from('article_feedback').upsert({
    article_id: articleId,
    user_id: userId,
    helpful,
    feedback,
  }, { onConflict: 'article_id,user_id' })
  return { error: articleWriteError(error) }
}

function articleWriteError(error: { code: string; message: string } | null) {
  if (!error) return null
  if (error.code === '42501') return 'Your account needs active membership in this article’s space to do that.'
  return error.message
}

export async function saveArticleVersion(article: Article, body: string) {
  if (!supabase) return { error: 'Supabase is not configured.' }
  const { id: userId, error: userError } = await getAuthenticatedUserId()
  if (userError || !userId) return { error: userError }
  const { error: versionError } = await supabase.from('article_versions').insert({
    article_id: article.id,
    title: article.title,
    body,
    status: article.status,
    author_id: userId,
  })
  if (versionError) return { error: versionError.message }
  return saveArticleRecord({ ...article, body })
}

export async function createSpaceRecord(space: KnowledgeSpace) {
  if (!supabase) return { error: 'Supabase is not configured.' }
  const { id: userId, error: userError } = await getAuthenticatedUserId()
  if (userError || !userId) return { error: userError }
  const slug = space.name.toLowerCase().replace(/&/g, ' ').trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const { data: createdSpace, error: spaceError } = await supabase.from('spaces').insert({
    name: space.name,
    slug,
    description: space.description,
    color: space.color,
    owner_id: userId,
  }).select('id').single()
  if (spaceError || !createdSpace) return { error: spaceError?.message ?? 'Could not create the space.' }
  const categories = [...new Set(space.categories.map((category) => category.trim()).filter(Boolean))]
  if (categories.length) {
    const { error } = await supabase.from('categories').insert(categories.map((name) => ({ space_id: createdSpace.id, name })))
    if (error) {
      await supabase.from('spaces').delete().eq('id', createdSpace.id)
      return { error: error.message }
    }
  }
  return { error: null }
}

export async function saveSpaceRecord(previousName: string | null, space: KnowledgeSpace) {
  if (!supabase) return { error: 'Supabase is not configured.' }
  if (!previousName) return createSpaceRecord(space)
  const slug = space.name.toLowerCase().replace(/&/g, ' ').trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const { error } = await supabase.from('spaces').update({ name: space.name, slug, description: space.description, color: space.color }).eq('name', previousName)
  return { error: error?.message ?? null }
}

export async function deleteSpaceRecord(name: string) {
  if (!supabase) return { error: 'Supabase is not configured.' }
  const { data: space, error: spaceError } = await supabase.from('spaces').select('id').eq('name', name).single()
  if (spaceError || !space) return { error: spaceError?.message ?? 'Space not found.' }
  const { data: assets, error: assetsError } = await supabase.from('knowledge_assets').select('storage_path').eq('space_id', space.id)
  if (assetsError) return { error: assetsError.message }
  const storagePaths = (assets ?? []).map((asset) => asset.storage_path)
  if (storagePaths.length) {
    const { error: storageError } = await supabase.storage.from(supabaseBucket).remove(storagePaths)
    if (storageError) return { error: storageError.message }
  }
  const { error } = await supabase.from('spaces').delete().eq('id', space.id)
  return { error: error?.message ?? null }
}

export async function deleteArticleRecord(articleId: string) {
  if (!supabase) return { error: 'Supabase is not configured.' }
  const { error } = await supabase.from('articles').delete().eq('id', articleId)
  return { error: error?.message ?? null }
}

export async function saveQuestionChanges(previous: KnowledgeQuestion[], next: KnowledgeQuestion[]) {
  if (!supabase) return { error: 'Supabase is not configured.' }
  const { id: userId, error: userError } = await getAuthenticatedUserId()
  if (userError || !userId) return { error: userError }
  const previousById = new Map(previous.map((question) => [question.id, question]))
  const nextIds = new Set(next.map((question) => question.id))

  for (const question of next) {
    const { id: spaceId, error: spaceError } = await getSpaceId(question.space)
    if (spaceError || !spaceId) return { error: spaceError ?? `Space "${question.space}" does not exist.` }
    const previousQuestion = previousById.get(question.id)
    const questionRecord = {
      space_id: spaceId,
      title: question.title,
      body: question.body,
      tags: question.tags,
      accepted_answer_id: question.acceptedAnswerId ?? null,
    }
    const questionChanged = previousQuestion && (
      previousQuestion.title !== question.title ||
      previousQuestion.body !== question.body ||
      JSON.stringify(previousQuestion.tags) !== JSON.stringify(question.tags) ||
      previousQuestion.acceptedAnswerId !== question.acceptedAnswerId
    )
    const questionResult = !previousQuestion
      ? await supabase.from('knowledge_questions').insert({ ...questionRecord, id: question.id, author_id: userId })
      : questionChanged
        ? await supabase.from('knowledge_questions').update(questionRecord).eq('id', question.id)
        : { error: null }
    if (questionResult.error) return { error: questionResult.error.message }

    if (previousQuestion && question.votedByMe !== previousQuestion.votedByMe) {
      const voteResult = question.votedByMe
        ? await supabase.from('question_votes').upsert({ question_id: question.id, user_id: userId }, { onConflict: 'question_id,user_id', ignoreDuplicates: true })
        : await supabase.from('question_votes').delete().eq('question_id', question.id).eq('user_id', userId)
      if (voteResult.error) return { error: voteResult.error.message }
    }

    const oldAnswers = new Map((previousQuestion?.answers ?? []).map((answer) => [answer.id, answer]))
    for (const answer of question.answers) {
      const oldAnswer = oldAnswers.get(answer.id)
      if (!oldAnswer) {
        const { error } = await supabase.from('question_answers').insert({
          id: answer.id,
          question_id: question.id,
          author_id: userId,
          body: answer.body,
          verified_by: answer.verified ? userId : null,
        })
        if (error) return { error: error.message }
      } else if (oldAnswer.verified !== answer.verified) {
        const { error } = await supabase.from('question_answers').update({ verified_by: answer.verified ? userId : null }).eq('id', answer.id)
        if (error) return { error: error.message }
      }
      if (oldAnswer && answer.votedByMe !== oldAnswer.votedByMe) {
        const voteResult = answer.votedByMe
          ? await supabase.from('answer_votes').upsert({ answer_id: answer.id, user_id: userId }, { onConflict: 'answer_id,user_id', ignoreDuplicates: true })
          : await supabase.from('answer_votes').delete().eq('answer_id', answer.id).eq('user_id', userId)
        if (voteResult.error) return { error: voteResult.error.message }
      }
    }
  }

  for (const question of previous) {
    if (nextIds.has(question.id)) continue
    const { error } = await supabase.from('knowledge_questions').delete().eq('id', question.id)
    if (error) return { error: error.message }
  }
  const { data: voteCounts, error: voteCountError } = await supabase.rpc('get_workspace_vote_counts')
  if (voteCountError) return { error: voteCountError.message }
  const voteCountRows = (voteCounts ?? []) as { vote_type: string; target_id: string; vote_count: number | string }[]
  const countByTarget = new Map<string, number>(voteCountRows.map((vote) => [`${vote.vote_type}:${vote.target_id}`, Number(vote.vote_count)]))
  return {
    questions: next.map((question) => ({
      ...question,
      votes: countByTarget.get(`question:${question.id}`) ?? 0,
      answers: question.answers.map((answer) => ({ ...answer, votes: countByTarget.get(`answer:${answer.id}`) ?? 0 })),
    })),
    error: null,
  }
}

export async function saveWorkspaceSettings(settings: WorkspaceSettings) {
  if (!supabase) return { error: 'Supabase is not configured.' }
  const { id: userId, error: userError } = await getAuthenticatedUserId()
  if (userError || !userId) return { error: userError }
  const { error } = await supabase.from('workspace_settings').upsert({ key: 'workspace', value: settings, updated_by: userId })
  return { error: error?.message ?? null }
}

export async function setArticleBookmark(articleId: string, bookmarked: boolean) {
  if (!supabase) return { error: 'Supabase is not configured.' }
  const { id: userId, error: userError } = await getAuthenticatedUserId()
  if (userError || !userId) return { error: userError }
  const result = bookmarked
    ? await supabase.from('bookmarks').upsert({ user_id: userId, article_id: articleId })
    : await supabase.from('bookmarks').delete().eq('user_id', userId).eq('article_id', articleId)
  return { error: result.error?.message ?? null }
}

export async function recordSearchGap(query: string) {
  if (!supabase) return { error: 'Supabase is not configured.' }
  const { id: userId, error: userError } = await getAuthenticatedUserId()
  if (userError || !userId) return { error: userError }
  const { error } = await supabase.from('search_queries').insert({ user_id: userId, query, result_count: 0 })
  return { error: error?.message ?? null }
}

export async function createIntegrationRecord(integration: KnowledgeIntegration) {
  if (!supabase) return { error: 'Supabase is not configured.' }
  const { id: userId, error: userError } = await getAuthenticatedUserId()
  if (userError || !userId) return { error: userError }
  const { error } = await supabase.from('knowledge_integrations').insert({
    name: integration.name,
    description: integration.description,
    category: integration.category,
    connected: integration.connected,
    created_by: userId,
  })
  return { error: error?.message ?? null }
}

export async function createTaxonomyTerm(name: string) {
  if (!supabase) return { error: 'Supabase is not configured.' }
  const { id: userId, error: userError } = await getAuthenticatedUserId()
  if (userError || !userId) return { error: userError }
  const { error } = await supabase.from('taxonomy_terms').insert({ name, created_by: userId })
  return { error: error?.message ?? null }
}

export async function recordAuditEvent(actorName: string, action: string, target: string, type: AuditEvent['type']) {
  if (!supabase) return { data: null, error: 'Supabase is not configured.' }
  const { id: userId, error: userError } = await getAuthenticatedUserId()
  if (userError || !userId) return { data: null, error: userError }
  const { data, error } = await supabase.from('audit_events').insert({
    actor_id: userId,
    action,
    target_type: type,
    target_id: target,
    details: { target },
  }).select('id, created_at').single()
  if (error || !data) return { data: null, error: error?.message ?? 'Could not record this workspace event.' }
  return {
    data: {
      id: data.id,
      actor: actorName,
      action,
      target,
      date: new Date(data.created_at).toLocaleString(),
      type,
    } satisfies AuditEvent,
    error: null,
  }
}

export async function loadWorkspaceAdminData(mode: 'people' | 'audit' = 'people') {
  if (!supabase) return { data: null, error: 'Supabase is not configured.' }

  if (mode === 'audit') {
    const [eventsResult, profilesResult] = await Promise.all([
      supabase.from('audit_events').select('id, actor_id, action, target_type, target_id, details, created_at').order('created_at', { ascending: false }).limit(200),
      supabase.rpc('get_workspace_member_directory'),
    ])
    const error = eventsResult.error ?? profilesResult.error
    if (error) return { data: null, error: error.message }
    const profilesById = mapWorkspaceMembers(profilesResult.data)
    const events: AuditEvent[] = (eventsResult.data ?? []).map((event) => ({
      id: event.id,
      actor: event.actor_id ? profilesById.get(event.actor_id) || 'Workspace member' : 'System',
      action: event.action,
      target: (event.details as { target?: string } | null)?.target || event.target_id,
      date: new Date(event.created_at).toLocaleString(),
      type: (event.target_type === 'Content' || event.target_type === 'Access' ? event.target_type : 'Workspace') as AuditEvent['type'],
    }))
    return { data: { users: [], events, spaces: [] } satisfies WorkspaceAdminData, error: null }
  }

  const [profilesResult, membershipsResult, spacesResult] = await Promise.all([
    supabase.from('profiles').select('id, email, display_name, department, role, status').order('display_name'),
    supabase.from('space_members').select('user_id, space_id').order('created_at'),
    supabase.from('spaces').select('id, name').order('name'),
  ])

  const queryError = profilesResult.error ?? membershipsResult.error ?? spacesResult.error
  if (queryError) return { data: null, error: queryError.message }

  const spacesById = new Map((spacesResult.data ?? []).map((space) => [space.id, space.name]))
  const membershipsByUser = new Map<string, string[]>()
  for (const membership of membershipsResult.data ?? []) {
    const spaceName = spacesById.get(membership.space_id)
    if (!spaceName) continue
    membershipsByUser.set(membership.user_id, [...(membershipsByUser.get(membership.user_id) ?? []), spaceName])
  }

  const users: WorkspaceUser[] = (profilesResult.data ?? []).map((profile) => ({
    id: profile.id,
    name: profile.display_name || profile.email.split('@')[0],
    email: profile.email,
    department: profile.department,
    role: profile.role as WorkspaceUser['role'],
    status: profile.status as WorkspaceUser['status'],
    space: profile.role === 'Super Admin' || (spacesById.size > 0 && (membershipsByUser.get(profile.id)?.length ?? 0) >= spacesById.size)
      ? 'All spaces'
      : membershipsByUser.get(profile.id)?.[0] ?? 'All spaces',
  }))

  return { data: { users, events: [], spaces: (spacesResult.data ?? []).map((space) => space.name) } satisfies WorkspaceAdminData, error: null }
}

export async function manageWorkspaceUser(
  action: 'invite' | 'update' | 'status' | 'delete' | 'complete-password-setup',
  payload: { member?: Partial<WorkspaceUser>; userId?: string; status?: WorkspaceUser['status'] },
) {
  if (!supabase) return { data: null, error: 'Supabase is not configured.' }
  const { data, error } = await supabase.functions.invoke('manage-workspace-user', { body: { action, ...payload } })
  if (!error) return { data, error: null }
  const cannotReachFunction = error.name === 'FunctionsFetchError' || error.message.includes('Failed to send a request')
  return {
    data: null,
    error: cannotReachFunction
      ? 'Could not reach the manage-workspace-user Edge Function. Deploy it to the Supabase project configured in VITE_SUPABASE_URL and check the function logs.'
      : error.message,
  }
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

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
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

export async function getCurrentWorkspaceRole(authenticatedUserId?: string) {
  if (!supabase) {
    return {
      role: null,
      error: 'Supabase is not configured.',
    }
  }

  let userId = authenticatedUserId
  if (!userId) {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) return { role: null, error: userError?.message ?? 'No authenticated user.' }
    userId = userData.user.id
  }
  const resolvedUserId = userId

  const { data, error } = await supabase
    .from('profiles')
    .select('role, display_name, status, password_setup_required')
    .eq('id', resolvedUserId)
    .single()

  if (error) return { role: null, error: error.message }
  if (data.status !== 'Active') return { role: null, error: 'Your workspace account is not active.' }
  return { role: data.role as string, userId: resolvedUserId, userName: data.display_name || 'Workspace member', passwordSetupRequired: data.password_setup_required, error: null }
}

export async function changeOwnPassword(password: string, currentPassword?: string) {
  if (!supabase) return { error: 'Password changes are unavailable. Configure Supabase first.' }
  if (currentPassword) {
    const { data, error: userError } = await supabase.auth.getUser()
    if (userError || !data.user?.email) return { error: userError?.message ?? 'Could not verify the signed-in account.' }
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: data.user.email, password: currentPassword })
    if (verifyError) return { error: 'Current password is incorrect.' }
  }
  const { error } = await supabase.auth.updateUser({ password })
  return { error: error?.message ?? null }
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

  const { data: space, error: spaceError } = await supabase
    .from('spaces')
    .select('id, name, slug')
    .eq('name', spaceName)
    .maybeSingle()
  if (spaceError) return { data: null, error: spaceError.message }
  if (!space) return { data: null, error: `Space "${spaceName}" is not available to your account. Ask a workspace admin to add you to that space.` }

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

  const assetId = crypto.randomUUID()
  const { error: metadataError } = await supabase
    .from('knowledge_assets')
    .insert({
      id: assetId,
      space_id: space.id,
      uploaded_by: userData.user.id,
      name: file.name,
      kind,
      storage_path: filePath,
      mime_type: file.type || 'application/octet-stream',
      byte_size: file.size,
      status: 'Processing',
    })

  if (metadataError) {
    await supabase.storage.from(supabaseBucket).remove([filePath])
    return { data: null, error: metadataError.message }
  }

  return {
    data: {
      id: assetId,
      name: file.name,
      kind: kind as KnowledgeAsset['kind'],
      space: space.name,
      size: fileSizeLabel(file.size),
      updated: 'Just now',
      status: 'Processing',
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
