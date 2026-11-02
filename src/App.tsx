import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { BookOpenText, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { Sidebar } from './components/shell/Sidebar'
import { Topbar } from './components/shell/Topbar'
import { Dashboard } from './features/dashboard/Dashboard'
import { CreateArticleDialog } from './features/knowledge/CreateArticleDialog'
import { KnowledgeTable } from './features/knowledge/KnowledgeTable'
import { AddKnowledgeDialog, type KnowledgeAction } from './features/knowledge/AddKnowledgeDialog'
import { KnowledgeAssetDialog } from './features/knowledge/KnowledgeAssetDialog'
import { KnowledgeSourceDialog } from './features/knowledge/KnowledgeSourceDialog'
import { KnowledgeModelsHub } from './features/knowledge/KnowledgeModelsHub'
import { Button } from './components/ui/Button'
import HelpCenter from './features/help/HelpCenter'
import { createIntegrationRecord, createTaxonomyTerm, deleteArticleRecord, deleteSpaceRecord, getCurrentWorkspaceRole, isSupabaseConfigured, loadWorkspaceAdminData, loadWorkspaceData, manageWorkspaceUser, recordAuditEvent, recordSearchGap, resetPassword, saveArticleComment, saveArticleFeedback, saveArticleRecord, saveArticleVersion as saveArticleVersionRecord, saveQuestionChanges, saveSpaceRecord, saveWorkspaceSettings, setArticleBookmark, signInWithEmail, signOut, supabase, uploadKnowledgeFile } from './lib/supabase'
import type { Article, ArticleComment, ArticleStatus, ArticleVersion, AuditEvent, KnowledgeAsset, KnowledgeIntegration, KnowledgeModel, KnowledgeQuestion, KnowledgeSpace, Role, View, WorkspaceSettings, WorkspaceUser } from './types'

const ArticleDetail = lazy(() => import('./features/knowledge/ArticleDetail').then((module) => ({ default: module.ArticleDetail })))
const SearchResults = lazy(() => import('./features/knowledge/SearchResults').then((module) => ({ default: module.SearchResults })))
const SpacesView = lazy(() => import('./features/spaces/SpacesView').then((module) => ({ default: module.SpacesView })))
const QuestionsView = lazy(() => import('./features/questions/QuestionsView').then((module) => ({ default: module.QuestionsView })))
const AdminView = lazy(() => import('./features/admin/AdminView').then((module) => ({ default: module.AdminView })))

const roleViews: Record<Role, View[]> = {
  'Super Admin': ['overview', 'library', 'models', 'reviews', 'questions', 'analytics', 'spaces', 'people', 'settings', 'audit', 'search', 'article', 'question', 'help'],
  'Space Admin': ['overview', 'library', 'models', 'reviews', 'questions', 'analytics', 'spaces', 'search', 'article', 'question', 'help'],
  Author: ['overview', 'library', 'models', 'questions', 'spaces', 'search', 'article', 'question', 'help'],
  Reviewer: ['overview', 'library', 'questions', 'spaces', 'search', 'article', 'question', 'help'],
  Viewer: ['overview', 'library', 'questions', 'spaces', 'search', 'article', 'question', 'help'],
}

const defaultSettings: WorkspaceSettings = { reviewRequired: true, reviewCadenceMonths: 6, notifyOwners: true, allowGuestQuestions: true, defaultArticleVisibility: 'Space members' }
const formatTimestamp = () => new Date().toLocaleString()
const resolveRoleFromMetadata = (role: unknown): Role => {
  const allowedRoles: Role[] = ['Super Admin', 'Space Admin', 'Author', 'Reviewer', 'Viewer']
  const normalized = typeof role === 'string' ? role.trim() : ''
  if (!normalized) return 'Viewer'

  const normalizedKey = normalized.toLowerCase().replace(/[^a-z]+/g, ' ').trim()
  const aliases: Record<string, Role> = {
    'super admin': 'Super Admin',
    'space admin': 'Space Admin',
    'author': 'Author',
    'reviewer': 'Reviewer',
    'viewer': 'Viewer',
    'super admin admin': 'Super Admin',
    'space admin admin': 'Space Admin',
  }

  if (allowedRoles.includes(normalized as Role)) return normalized as Role
  if (aliases[normalizedKey]) return aliases[normalizedKey]

  return 'Viewer'
}

function App() {
  const [role, setRole] = useState<Role>('Viewer')
  const [currentUserName, setCurrentUserName] = useState('')
  const [activeView, setActiveView] = useState<View>('overview')
  const [isLoggedOut, setIsLoggedOut] = useState(true)
  const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseConfigured)
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isAddKnowledgeOpen, setIsAddKnowledgeOpen] = useState(false)
  const [isAssetOpen, setIsAssetOpen] = useState(false)
  const [isSourceOpen, setIsSourceOpen] = useState(false)
  const [isSpaceCreateOpen, setIsSpaceCreateOpen] = useState(false)
  const [createSpace, setCreateSpace] = useState('')
  const [selectedSpaceName, setSelectedSpaceName] = useState<string | null>(null)
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [passwordResetOpen, setPasswordResetOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetNotice, setResetNotice] = useState('')
  const effectiveView = roleViews[role].includes(activeView) ? activeView : 'overview'
  const [articles, setArticles] = useState<Article[]>([])
  const [questions, setQuestions] = useState<KnowledgeQuestion[]>([])
  const [spaces, setSpaces] = useState<KnowledgeSpace[]>([])
  const [users, setUsers] = useState<WorkspaceUser[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [adminSpaces, setAdminSpaces] = useState<string[]>([])
  const [adminDataLoading, setAdminDataLoading] = useState(false)
  const [adminDataError, setAdminDataError] = useState<string | null>(null)
  const [workspaceDataLoading, setWorkspaceDataLoading] = useState(false)
  const [workspaceDataError, setWorkspaceDataError] = useState<string | null>(null)
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [zeroResultQueries, setZeroResultQueries] = useState<string[]>([])
  const [settings, setSettings] = useState<WorkspaceSettings>(defaultSettings)
  const [knowledgeAssets, setKnowledgeAssets] = useState<KnowledgeAsset[]>([])
  const [knowledgeModels, setKnowledgeModels] = useState<KnowledgeModel[]>([])
  const [knowledgeIntegrations, setKnowledgeIntegrations] = useState<KnowledgeIntegration[]>([])
  const [taxonomyTerms, setTaxonomyTerms] = useState<string[]>([])
  const selectedArticle = articles.find((article) => article.id === selectedArticleId)
  const knowledgeSpaceContext = selectedSpaceName ?? createSpace ?? spaces[0]?.name ?? ''
  const visibleArticles = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return articles
    return articles.filter((article) => [article.title, article.summary, article.body, article.space, article.category, article.owner, ...article.tags].join(' ').toLowerCase().includes(query))
  }, [articles, search])

  useEffect(() => {
    if (!supabase) return
    let active = true
    const syncSession = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'], forceLogin: boolean) => {
      let nextRole: Role = 'Viewer'
      if (session && !forceLogin) {
        const { role: profileRole } = await getCurrentWorkspaceRole()
        if (profileRole) nextRole = resolveRoleFromMetadata(profileRole)
      }
      if (!active) return
      setRole(nextRole)
      if (session && !forceLogin) {
        setWorkspaceDataLoading(true)
        const { data: workspaceData, error: workspaceError } = await loadWorkspaceData(nextRole)
        if (active) {
          setArticles(workspaceData?.articles ?? [])
          setCurrentUserName(workspaceData?.currentUserName ?? '')
          setQuestions(workspaceData?.questions ?? [])
          setSpaces(workspaceData?.spaces ?? [])
          setKnowledgeAssets(workspaceData?.assets ?? [])
          setKnowledgeModels(workspaceData?.models ?? [])
          setKnowledgeIntegrations(workspaceData?.integrations ?? [])
          setTaxonomyTerms(workspaceData?.taxonomyTerms ?? [])
          setBookmarks(workspaceData?.bookmarks ?? [])
          setZeroResultQueries(workspaceData?.zeroResultQueries ?? [])
          setSettings(workspaceData?.settings ?? defaultSettings)
          setWorkspaceDataError(workspaceError)
          setWorkspaceDataLoading(false)
          if (workspaceData?.spaces[0] && !createSpace) setCreateSpace(workspaceData.spaces[0].name)
        }
        if (nextRole === 'Super Admin') {
          setAdminDataLoading(true)
          const { data: adminData, error: adminError } = await loadWorkspaceAdminData()
          if (active) {
            setUsers(adminData?.users ?? [])
            setAuditEvents(adminData?.events ?? [])
            setAdminSpaces(adminData?.spaces ?? [])
            setAdminDataError(adminError)
            setAdminDataLoading(false)
          }
        } else {
          setUsers([])
          setAuditEvents([])
          setAdminSpaces([])
          setAdminDataError(null)
        }
      } else {
        setArticles([])
        setCurrentUserName('')
        setQuestions([])
        setSpaces([])
        setKnowledgeAssets([])
        setKnowledgeModels([])
        setKnowledgeIntegrations([])
        setTaxonomyTerms([])
        setBookmarks([])
        setZeroResultQueries([])
        setUsers([])
        setAuditEvents([])
        setAdminSpaces([])
        setAdminDataError(null)
        setAdminDataLoading(false)
        setWorkspaceDataError(null)
        setWorkspaceDataLoading(false)
      }
      setIsLoggedOut(forceLogin || !session)
      setIsAuthLoading(false)
    }

    void supabase.auth.getSession().then(({ data }) => {
      const forceLogin = new URLSearchParams(window.location.search).get('auth') === 'login'
      return syncSession(data.session, forceLogin)
    }).catch(() => {
      if (!active) return
      setIsLoggedOut(true)
      setWorkspaceDataError('Unable to load your Supabase session.')
      setIsAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        const forceLogin = new URLSearchParams(window.location.search).get('auth') === 'login'
        void syncSession(session, forceLogin)
      }, 0)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const addEvent = (_actor: string, action: string, target: string, type: AuditEvent['type']) => {
    void recordAuditEvent(action, target, type).then(({ data, error }) => {
      if (data) setAuditEvents((current) => [data, ...current])
      else if (error) setWorkspaceDataError(error)
    })
  }
  const addArticle = async (article: Article) => {
    const newArticle = { ...article, body: article.body ?? '', reviewDue: 'Not scheduled' }
    const { error } = await saveArticleRecord(newArticle)
    if (error) return error
    setArticles((current) => [newArticle, ...current])
    setIsCreateOpen(false)
    addEvent(article.owner, 'Created draft', article.title, 'Content')
    setActiveView('library')
    return null
  }
  const handleKnowledgeAction = (action: KnowledgeAction) => {
    if (action === 'article') openCreateForSpace(knowledgeSpaceContext)
    if (action === 'asset') setIsAssetOpen(true)
    if (action === 'metadata' || action === 'ai-context') setActiveView('models')
    if (action === 'question') setActiveView('questions')
    if (action === 'source') setIsSourceOpen(true)
  }
  const addKnowledgeAsset = async (asset: KnowledgeAsset, file: File) => {
    const { data, error } = await uploadKnowledgeFile(file, asset.space, asset.kind)
    if (error || !data) return error ?? 'The file could not be uploaded.'
    setKnowledgeAssets((current) => [data, ...current])
    setIsAssetOpen(false)
    addEvent('Current user', 'Added knowledge asset', asset.name, 'Content')
    setActiveView('models')
    return null
  }
  const addKnowledgeIntegration = async (integration: KnowledgeIntegration) => {
    const { error } = await createIntegrationRecord(integration)
    if (error) {
      setWorkspaceDataError(error)
      return
    }
    setKnowledgeIntegrations((current) => [integration, ...current])
    setIsSourceOpen(false)
    addEvent('Atlas Admin', 'Added source connector', integration.name, 'Workspace')
    setActiveView('models')
  }
  const addTaxonomyTerm = async (term: string) => {
    if (taxonomyTerms.includes(term)) return
    const { error } = await createTaxonomyTerm(term)
    if (error) {
      setWorkspaceDataError(error)
      return
    }
    setTaxonomyTerms((current) => [...current, term])
    addEvent('Atlas Admin', 'Added taxonomy term', `#${term}`, 'Workspace')
  }
  const changeWorkspaceSettings = async (nextSettings: WorkspaceSettings) => {
    const { error } = await saveWorkspaceSettings(nextSettings)
    if (error) {
      setWorkspaceDataError(error)
      return
    }
    setSettings(nextSettings)
  }
  const changeQuestions = async (nextQuestions: KnowledgeQuestion[]) => {
    const { questions: savedQuestions, error } = await saveQuestionChanges(questions, nextQuestions)
    if (error) {
      setWorkspaceDataError(error)
      return null
    }
    const result = savedQuestions ?? nextQuestions
    setQuestions(result)
    return result
  }
  const toggleBookmark = async (articleId: string) => {
    const shouldBookmark = !bookmarks.includes(articleId)
    const { error } = await setArticleBookmark(articleId, shouldBookmark)
    if (error) {
      setWorkspaceDataError(error)
      return
    }
    setBookmarks((current) => shouldBookmark ? [...current, articleId] : current.filter((id) => id !== articleId))
  }
  const saveZeroResult = async (query: string) => {
    const normalized = query.trim()
    if (!normalized || zeroResultQueries.includes(normalized)) return
    const { error } = await recordSearchGap(normalized)
    if (error) {
      setWorkspaceDataError(error)
      return
    }
    setZeroResultQueries((current) => [normalized, ...current])
  }
  const openArticle = (article: Article) => {
    setSelectedArticleId(article.id)
    setActiveView('article')
  }
  const updateArticle = (id: string, update: (article: Article) => Article) => setArticles((current) => current.map((article) => article.id === id ? update(article) : article))
  const autosaveArticle = async (body: string) => {
    if (!selectedArticle) return
    const updatedArticle = { ...selectedArticle, body, updated: 'Just now' }
    const { error } = await saveArticleRecord(updatedArticle)
    if (error) {
      setWorkspaceDataError(error)
      return
    }
    updateArticle(selectedArticle.id, () => updatedArticle)
  }
  const saveArticleVersion = async (body: string) => {
    if (!selectedArticle) return
    const { error } = await saveArticleVersionRecord(selectedArticle, body)
    if (error) {
      setWorkspaceDataError(error)
      return
    }
    const version: ArticleVersion = { id: crypto.randomUUID(), title: selectedArticle.title, body, status: selectedArticle.status, author: selectedArticle.owner, savedAt: formatTimestamp() }
    updateArticle(selectedArticle.id, (article) => ({ ...article, body, versions: [version, ...(article.versions ?? [])] }))
    addEvent('Atlas Admin', 'Saved version', selectedArticle.title, 'Content')
  }
  const changeArticleStatus = async (status: ArticleStatus) => {
    if (!selectedArticle) return
    const updatedArticle = { ...selectedArticle, status, updated: 'Just now' }
    const { error } = await saveArticleRecord(updatedArticle)
    if (error) {
      setWorkspaceDataError(error)
      return
    }
    updateArticle(selectedArticle.id, () => updatedArticle)
    addEvent('Atlas Admin', `${status === 'Under review' ? 'Requested review for' : status === 'Published' ? 'Published' : 'Archived'}`, selectedArticle.title, 'Content')
  }
  const addArticleComment = async (comment: ArticleComment) => {
    if (!selectedArticle) return
    const { error } = await saveArticleComment(selectedArticle.id, comment.body)
    if (error) {
      setWorkspaceDataError(error)
      return
    }
    updateArticle(selectedArticle.id, (article) => ({ ...article, comments: [...(article.comments ?? []), comment] }))
  }
  const addArticleFeedback = async (helpful: boolean, feedback: string) => {
    if (!selectedArticle) return
    const { error } = await saveArticleFeedback(selectedArticle.id, helpful, feedback)
    if (error) setWorkspaceDataError(error)
  }
  const restoreArticleVersion = async (version: ArticleVersion) => {
    if (!selectedArticle) return
    const updatedArticle = { ...selectedArticle, body: version.body, status: version.status, updated: 'Just now' }
    const { error } = await saveArticleRecord(updatedArticle)
    if (error) {
      setWorkspaceDataError(error)
      return
    }
    updateArticle(selectedArticle.id, () => updatedArticle)
    addEvent('Atlas Admin', 'Restored version', selectedArticle.title, 'Content')
  }
  const removeArticle = async () => {
    if (!selectedArticle) return
    const { error } = await deleteArticleRecord(selectedArticle.id)
    if (error) {
      setWorkspaceDataError(error)
      return
    }
    setArticles((current) => current.filter((article) => article.id !== selectedArticle.id))
    setSelectedArticleId(null)
    setActiveView('library')
    addEvent(currentUserName, 'Deleted article', selectedArticle.title, 'Content')
  }
  const updateUser = async (user: WorkspaceUser) => {
    const { error } = await manageWorkspaceUser('update', { member: user })
    if (error) return error
    setUsers((current) => current.map((existing) => existing.id === user.id ? user : existing))
    const { data, error: refreshError } = await loadWorkspaceAdminData()
    if (data) {
      setAuditEvents(data.events)
      setAdminSpaces(data.spaces)
    }
    setAdminDataError(refreshError)
    return null
  }
  const inviteUser = async (user: Omit<WorkspaceUser, 'id'>) => {
    const { data: result, error } = await manageWorkspaceUser('invite', { member: user })
    if (error) return error
    const member = (result as { member?: WorkspaceUser } | null)?.member
    if (member) setUsers((current) => [member, ...current])
    const { data, error: refreshError } = await loadWorkspaceAdminData()
    if (data) {
      setUsers(data.users)
      setAuditEvents(data.events)
      setAdminSpaces(data.spaces)
    }
    setAdminDataError(refreshError)
    return null
  }
  const setUserStatus = async (userId: string, status: WorkspaceUser['status']) => {
    const { error } = await manageWorkspaceUser('status', { userId, status })
    if (error) return error
    setUsers((current) => current.map((user) => user.id === userId ? { ...user, status } : user))
    const { data, error: refreshError } = await loadWorkspaceAdminData()
    if (data) setAuditEvents(data.events)
    setAdminDataError(refreshError)
    return null
  }
  const deleteUser = async (userId: string) => {
    const { error } = await manageWorkspaceUser('delete', { userId })
    if (error) return error
    setUsers((current) => current.filter((user) => user.id !== userId))
    const { data, error: refreshError } = await loadWorkspaceAdminData()
    if (data) setAuditEvents(data.events)
    setAdminDataError(refreshError)
    return null
  }
  const openCreateForSpace = (spaceName: string) => {
    setCreateSpace(spaceName || spaces[0]?.name || '')
    setIsCreateOpen(true)
  }
  const openSpace = (spaceName: string) => {
    setSelectedSpaceName(spaceName)
    setActiveView('spaces')
  }
  const openSpaceCreator = () => {
    setSelectedSpaceName(null)
    setActiveView('spaces')
    setIsSpaceCreateOpen(true)
  }
  const saveSpaceItem = async (space: KnowledgeSpace, previousName: string | null = null) => {
    const { error } = await saveSpaceRecord(previousName, space)
    if (error) {
      setWorkspaceDataError(error)
      return
    }
    setSpaces((current) => previousName
      ? current.map((existing) => existing.name === previousName ? space : existing)
      : [...current, space])
    if (selectedSpaceName === previousName) setSelectedSpaceName(space.name)
    addEvent(currentUserName, previousName ? 'Updated space' : 'Created space', space.name, 'Workspace')
  }
  const removeSpaceItem = async (spaceName: string) => {
    const { error } = await deleteSpaceRecord(spaceName)
    if (error) {
      setWorkspaceDataError(error)
      return
    }
    setSpaces((current) => current.filter((space) => space.name !== spaceName))
    setArticles((current) => current.filter((article) => article.space !== spaceName))
    if (selectedSpaceName === spaceName) {
      setSelectedSpaceName(null)
      setActiveView('spaces')
    }
    addEvent(currentUserName, 'Deleted space', spaceName, 'Workspace')
  }
  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const emailInput = form.querySelector('#login-email') as HTMLInputElement | null
    const passwordInput = form.querySelector('#login-password') as HTMLInputElement | null
    const email = emailInput?.value ?? ''
    const password = passwordInput?.value ?? ''
    setIsSubmittingLogin(true)
    setResetNotice('')
    try {
      const { data, error } = await signInWithEmail(email, password)
      if (error || !data?.user) {
        setResetNotice(error ?? 'Unable to sign in. Please try again.')
        return
      }
      const { role: profileRole, error: profileError } = await getCurrentWorkspaceRole()
      if (profileError || !profileRole) {
        await signOut()
        setResetNotice(profileError ?? 'Your workspace profile is not set up yet. Ask an administrator to provision your account.')
        return
      }
      setRole(resolveRoleFromMetadata(profileRole))
      setIsLoggedOut(false)
      if (typeof window !== 'undefined') {
        const nextUrl = new URL(window.location.href)
        nextUrl.searchParams.delete('auth')
        nextUrl.searchParams.delete('redirect')
        window.history.replaceState({}, '', nextUrl)
      }
    } catch {
      setResetNotice('Unable to reach the sign-in service. Check your connection and try again.')
    } finally {
      setIsSubmittingLogin(false)
    }
  }
  const requestPasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!resetEmail.trim()) return
    const { error } = await resetPassword(resetEmail.trim())
    setResetNotice(error ?? `Password reset link sent to ${resetEmail.trim()}.`)
    setPasswordResetOpen(false)
    setResetEmail('')
  }

  if (isAuthLoading) return <main className="signed-out-screen"><section className="signed-out-panel auth-loading-panel" role="status"><div className="brand-mark"><BookOpenText size={19} /></div><LoaderCircle className="auth-loading-spinner" size={20} /><p>Checking your session…</p></section></main>
  if (isLoggedOut) return <main className="signed-out-screen"><form className="signed-out-panel" onSubmit={submitLogin}><div className="brand-mark"><BookOpenText size={19} /></div><div className="eyebrow">ATLAS KNOWLEDGE WORKSPACE</div><h1>Welcome back.</h1><p>Sign in with your organization account to continue.</p><label htmlFor="login-email">Work email</label><input id="login-email" type="email" autoComplete="username" placeholder="name@company.com" required disabled={isSubmittingLogin} /><label htmlFor="login-password">Password</label><div className="login-password-field"><input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" required disabled={isSubmittingLogin} /><button type="button" className="password-visibility-button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} disabled={isSubmittingLogin}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div><div className="auth-actions"><button className="auth-utility-link" type="button" onClick={() => setPasswordResetOpen(true)} disabled={isSubmittingLogin}>Forgot password?</button></div><Button type="submit" disabled={isSubmittingLogin}>{isSubmittingLogin ? <><LoaderCircle className="auth-loading-spinner" size={15} />Signing in…</> : 'Sign in'}</Button>{resetNotice && <span className="auth-reset-note" role="alert">{resetNotice}</span>}</form><Dialog.Root open={passwordResetOpen} onOpenChange={setPasswordResetOpen}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="create-dialog logout-dialog"><div className="dialog-heading"><Dialog.Title>Reset your password</Dialog.Title><Dialog.Description>We’ll send a reset link to your work email so you can regain access.</Dialog.Description></div><form onSubmit={requestPasswordReset}><label htmlFor="reset-email">Work email</label><input id="reset-email" type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder="name@company.com" required /><div className="dialog-actions"><Dialog.Close asChild><Button variant="ghost" type="button">Cancel</Button></Dialog.Close><Button type="submit">Send reset link</Button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root></main>

  return <div className="app-shell">
    <Sidebar activeView={effectiveView} onNavigate={setActiveView} role={role} userName={currentUserName} spaces={spaces} onOpenSpace={openSpace} onCreateSpace={openSpaceCreator} />
    <div className="app-main">
      <Topbar role={role} userName={currentUserName} activeView={effectiveView} search={search} onSearch={setSearch} onSearchSubmit={() => setActiveView('search')} onAskAtlas={() => setActiveView('questions')} onAddKnowledge={() => setIsAddKnowledgeOpen(true)} onLogout={async () => {
        const { error } = await signOut()
        if (error) setResetNotice(error)
        setIsLoggedOut(true)
        if (typeof window !== 'undefined') {
          const nextUrl = new URL(window.location.href)
          nextUrl.searchParams.set('auth', 'login')
          window.history.replaceState({}, '', nextUrl)
        }
      }} />
      <main className="page-content">{workspaceDataLoading && <div className="page-loading" role="status">Loading workspace data from Supabase…</div>}{workspaceDataError && <div className="admin-data-error" role="alert">Could not load workspace data from Supabase: {workspaceDataError}</div>}<Suspense fallback={<div className="page-loading" role="status">Loading workspace…</div>}>
        {effectiveView === 'overview' && <Dashboard role={role} userName={currentUserName} articles={visibleArticles} events={auditEvents} onNavigate={setActiveView} onNewArticle={() => setIsAddKnowledgeOpen(true)} onOpenArticle={openArticle} />}
        {effectiveView === 'library' && <KnowledgeTable articles={visibleArticles} role={role} title="Knowledge library" description="Browse the documents, playbooks, and answers shared across your workspace." onNewArticle={() => setIsAddKnowledgeOpen(true)} onOpenArticle={openArticle} />}
        {effectiveView === 'models' && <KnowledgeModelsHub models={knowledgeModels} assets={knowledgeAssets} integrations={knowledgeIntegrations} taxonomyTerms={taxonomyTerms} onNavigate={setActiveView} onCreateArticle={() => openCreateForSpace(spaces[0]?.name ?? '')} onCreateAsset={() => setIsAssetOpen(true)} onCreateSource={() => setIsSourceOpen(true)} onAddTaxonomyTerm={addTaxonomyTerm} />}
        {effectiveView === 'reviews' && <KnowledgeTable articles={visibleArticles} role={role} title="Review queue" description="Keep trusted knowledge moving with timely, thoughtful reviews." initialFilter="review" onNewArticle={() => openCreateForSpace('Engineering')} onOpenArticle={openArticle} />}
        {effectiveView === 'search' && <SearchResults articles={articles} query={search} onQueryChange={setSearch} onOpenArticle={openArticle} onSaveZeroResult={saveZeroResult} />}
        {effectiveView === 'article' && selectedArticle && <ArticleDetail article={selectedArticle} role={role} currentUserName={currentUserName} bookmarked={bookmarks.includes(selectedArticle.id)} onBack={() => setActiveView('library')} onBookmark={() => void toggleBookmark(selectedArticle.id)} onAutosave={autosaveArticle} onSaveVersion={saveArticleVersion} onStatusChange={changeArticleStatus} onComment={addArticleComment} onFeedback={addArticleFeedback} onRestoreVersion={restoreArticleVersion} onDelete={removeArticle} />}
        {effectiveView === 'spaces' && <SpacesView spaces={spaces} articles={articles} role={role} selectedSpaceName={selectedSpaceName} createOpen={isSpaceCreateOpen} onSelectSpace={setSelectedSpaceName} onCreateOpenChange={setIsSpaceCreateOpen} onOpenArticle={openArticle} onAddKnowledge={(spaceName) => { setCreateSpace(spaceName); setIsAddKnowledgeOpen(true) }} onSaveSpace={saveSpaceItem} onDeleteSpace={removeSpaceItem} />}
        {effectiveView === 'questions' && <QuestionsView questions={questions} spaces={spaces} role={role} currentUserName={currentUserName} initialSpace={knowledgeSpaceContext} onQuestionsChange={changeQuestions} />}
        {effectiveView === 'help' && <HelpCenter onNavigate={setActiveView} />}
        {effectiveView === 'analytics' && <AnalyticsView articles={articles} zeroResultQueries={zeroResultQueries} />}
        {effectiveView === 'people' && <AdminView mode="people" role={role} users={users} events={auditEvents} spaces={adminSpaces} usersLoading={adminDataLoading} usersError={adminDataError} settings={settings} onSettingsChange={changeWorkspaceSettings} onInvite={inviteUser} onUpdateUser={updateUser} onSetUserStatus={setUserStatus} onDeleteUser={deleteUser} />}
        {effectiveView === 'settings' && <AdminView mode="settings" role={role} users={users} events={auditEvents} spaces={adminSpaces} usersLoading={adminDataLoading} usersError={adminDataError} settings={settings} onSettingsChange={changeWorkspaceSettings} onInvite={inviteUser} onUpdateUser={updateUser} onSetUserStatus={setUserStatus} onDeleteUser={deleteUser} />}
        {effectiveView === 'audit' && <AdminView mode="audit" role={role} users={users} events={auditEvents} spaces={adminSpaces} usersLoading={adminDataLoading} usersError={adminDataError} settings={settings} onSettingsChange={changeWorkspaceSettings} onInvite={inviteUser} onUpdateUser={updateUser} onSetUserStatus={setUserStatus} onDeleteUser={deleteUser} />}
      </Suspense></main>
    </div>
    <CreateArticleDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onCreate={addArticle} author={currentUserName} spaces={spaces} initialSpace={createSpace} />
    <AddKnowledgeDialog open={isAddKnowledgeOpen} onOpenChange={setIsAddKnowledgeOpen} onSelect={handleKnowledgeAction} space={selectedSpaceName ?? createSpace ?? 'Engineering'} />
    <KnowledgeAssetDialog open={isAssetOpen} onOpenChange={setIsAssetOpen} onCreate={addKnowledgeAsset} spaces={spaces} initialSpace={knowledgeSpaceContext} />
    <KnowledgeSourceDialog open={isSourceOpen} onOpenChange={setIsSourceOpen} onCreate={addKnowledgeIntegration} initialSpace={knowledgeSpaceContext} />
  </div>
}

function AnalyticsView({ articles, zeroResultQueries }: { articles: Article[]; zeroResultQueries: string[] }) {
  const statuses = ['Published', 'Under review', 'Draft', 'Archived'].map((status) => ({
    label: status,
    count: articles.filter((article) => article.status === status).length,
  }))
  const maxStatusCount = Math.max(1, ...statuses.map((status) => status.count))
  const totalViews = articles.reduce((total, article) => {
    const rawViews = article.views.toLowerCase().replaceAll(',', '')
    const value = Number.parseFloat(rawViews)
    return total + (Number.isNaN(value) ? 0 : rawViews.endsWith('k') ? value * 1000 : value)
  }, 0)
  return <section className="page-section"><div className="page-heading"><div><div className="eyebrow">WORKSPACE INSIGHTS</div><h1>Knowledge analytics</h1><p>See what your team is learning, sharing, and still looking for.</p></div><button className="date-filter" type="button">Last 30 days <span>⌄</span></button></div>
    <div className="metric-grid analytics-summary"><article className="metric-card"><div className="metric-top"><span>Article views</span><span className="metric-icon tone-blue"><FileText size={17} /></span></div><div className="metric-value">{totalViews.toLocaleString()}</div><div className="metric-delta">Sum of stored article views</div></article><article className="metric-card"><div className="metric-top"><span>Published articles</span><span className="metric-icon tone-mint"><BookOpenText size={17} /></span></div><div className="metric-value">{statuses[0].count}</div><div className="metric-delta">Current Supabase records</div></article><article className="metric-card"><div className="metric-top"><span>Recorded search gaps</span><span className="metric-icon tone-peach"><AlertCircle size={17} /></span></div><div className="metric-value">{zeroResultQueries.length}</div><div className="metric-delta">No-result searches in Supabase</div></article></div>
    <div className="analytics-grid"><article className="panel traffic-panel"><div className="panel-heading"><div><h2>Articles by status</h2><p>Current records in this workspace</p></div><span className="chart-legend"><i /> Articles</span></div><div className="bar-chart" aria-label="Current articles by status">{statuses.map((status) => <div className="chart-column" key={status.label}><span style={{ height: `${Math.max(4, status.count / maxStatusCount * 100)}%` }} /><small>{status.label}</small></div>)}</div></article>
      <article className="panel search-gaps-panel"><div className="panel-heading"><div><h2>Search gaps</h2><p>Latest queries without a useful result</p></div><span className="count-label">{zeroResultQueries.length} total</span></div>{zeroResultQueries.slice(0, 4).map((query) => <div className="gap-row" key={query}><span>{query}</span></div>)}{zeroResultQueries.length === 0 && <div className="empty-state">No recorded search gaps.</div>}</article></div>
    <div className="section-title-row"><div><h2>Most viewed articles</h2><p>Content your team returns to most</p></div><span className="muted-count">{articles.length} tracked</span></div><KnowledgeTable articles={[...articles].sort((first, second) => Number.parseFloat(second.views) - Number.parseFloat(first.views)).slice(0, 4)} role="Super Admin" title="" description="" compact />
  </section>
}

export default App
