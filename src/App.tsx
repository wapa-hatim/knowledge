import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AlertCircle, BookOpenText, Eye, EyeOff, FileText, LoaderCircle, Search } from 'lucide-react'
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
import { getCurrentWorkspaceRole, isSupabaseConfigured, loadWorkspaceAdminData, loadWorkspaceData, manageWorkspaceUser, resetPassword, signInWithEmail, signOut, supabase, uploadKnowledgeFile } from './lib/supabase'
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
const createAuditEventId = () => `EV-${Date.now()}`
const createArticleVersionId = () => `V-${Date.now()}`
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

  const addEvent = (actor: string, action: string, target: string, type: AuditEvent['type']) => {
    setAuditEvents((current) => [{ id: createAuditEventId(), actor, action, target, type, date: 'Just now' }, ...current])
  }
  const addArticle = (article: Article) => {
    const newArticle = { ...article, body: article.body ?? `# ${article.title}\n\nStart with the purpose of this article.`, reviewDue: 'January 19, 2027' }
    setArticles((current) => [newArticle, ...current])
    setIsCreateOpen(false)
    addEvent(article.owner, 'Created draft', article.title, 'Content')
    setActiveView('library')
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
  const addKnowledgeIntegration = (integration: KnowledgeIntegration) => {
    setKnowledgeIntegrations((current) => [integration, ...current])
    setIsSourceOpen(false)
    addEvent('Atlas Admin', 'Added source connector', integration.name, 'Workspace')
    setActiveView('models')
  }
  const addTaxonomyTerm = (term: string) => {
    if (taxonomyTerms.includes(term)) return
    setTaxonomyTerms((current) => [...current, term])
    addEvent('Atlas Admin', 'Added taxonomy term', `#${term}`, 'Workspace')
  }
  const openArticle = (article: Article) => {
    setSelectedArticleId(article.id)
    setActiveView('article')
  }
  const updateArticle = (id: string, update: (article: Article) => Article) => setArticles((current) => current.map((article) => article.id === id ? update(article) : article))
  const autosaveArticle = (body: string) => {
    if (selectedArticle) updateArticle(selectedArticle.id, (article) => ({ ...article, body, updated: 'Just now' }))
  }
  const saveArticleVersion = (body: string) => {
    if (!selectedArticle) return
    const version: ArticleVersion = { id: createArticleVersionId(), title: selectedArticle.title, body, status: selectedArticle.status, author: 'Atlas Admin', savedAt: formatTimestamp() }
    updateArticle(selectedArticle.id, (article) => ({ ...article, body, versions: [version, ...(article.versions ?? [])] }))
    addEvent('Atlas Admin', 'Saved version', selectedArticle.title, 'Content')
  }
  const changeArticleStatus = (status: ArticleStatus) => {
    if (!selectedArticle) return
    updateArticle(selectedArticle.id, (article) => ({ ...article, status, updated: 'Just now' }))
    addEvent('Atlas Admin', `${status === 'Under review' ? 'Requested review for' : status === 'Published' ? 'Published' : 'Archived'}`, selectedArticle.title, 'Content')
  }
  const addArticleComment = (comment: ArticleComment) => {
    if (!selectedArticle) return
    updateArticle(selectedArticle.id, (article) => ({ ...article, comments: [...(article.comments ?? []), comment] }))
  }
  const restoreArticleVersion = (version: ArticleVersion) => {
    if (!selectedArticle) return
    updateArticle(selectedArticle.id, (article) => ({ ...article, body: version.body, status: version.status, updated: 'Just now' }))
    addEvent('Atlas Admin', 'Restored version', selectedArticle.title, 'Content')
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
    setCreateSpace(spaceName)
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
  const createSpaceItem = (space: KnowledgeSpace) => {
    setSpaces((current) => [...current, space])
    addEvent('Atlas Admin', 'Created space', space.name, 'Workspace')
  }
  const saveZeroResult = (query: string) => {
    setZeroResultQueries((current) => current.includes(query) ? current : [query, ...current])
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
    <Sidebar activeView={effectiveView} onNavigate={setActiveView} role={role} spaces={spaces} onOpenSpace={openSpace} onCreateSpace={openSpaceCreator} />
    <div className="app-main">
      <Topbar role={role} activeView={effectiveView} search={search} onSearch={setSearch} onSearchSubmit={() => setActiveView('search')} onAskAtlas={() => setActiveView('questions')} onAddKnowledge={() => setIsAddKnowledgeOpen(true)} onLogout={async () => {
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
        {effectiveView === 'overview' && <Dashboard role={role} articles={visibleArticles} onNavigate={setActiveView} onNewArticle={() => setIsAddKnowledgeOpen(true)} onOpenArticle={openArticle} />}
        {effectiveView === 'library' && <KnowledgeTable articles={visibleArticles} role={role} title="Knowledge library" description="Browse the documents, playbooks, and answers shared across your workspace." onNewArticle={() => setIsAddKnowledgeOpen(true)} onOpenArticle={openArticle} />}
        {effectiveView === 'models' && <KnowledgeModelsHub models={knowledgeModels} assets={knowledgeAssets} integrations={knowledgeIntegrations} taxonomyTerms={taxonomyTerms} onNavigate={setActiveView} onCreateArticle={() => openCreateForSpace(spaces[0]?.name ?? '')} onCreateAsset={() => setIsAssetOpen(true)} onCreateSource={() => setIsSourceOpen(true)} onAddTaxonomyTerm={addTaxonomyTerm} />}
        {effectiveView === 'reviews' && <KnowledgeTable articles={visibleArticles} role={role} title="Review queue" description="Keep trusted knowledge moving with timely, thoughtful reviews." initialFilter="review" onNewArticle={() => openCreateForSpace('Engineering')} onOpenArticle={openArticle} />}
        {effectiveView === 'search' && <SearchResults articles={articles} query={search} onQueryChange={setSearch} onOpenArticle={openArticle} onSaveZeroResult={saveZeroResult} />}
        {effectiveView === 'article' && selectedArticle && <ArticleDetail article={selectedArticle} role={role} bookmarked={bookmarks.includes(selectedArticle.id)} onBack={() => setActiveView('library')} onBookmark={() => setBookmarks((current) => current.includes(selectedArticle.id) ? current.filter((id) => id !== selectedArticle.id) : [...current, selectedArticle.id])} onAutosave={autosaveArticle} onSaveVersion={saveArticleVersion} onStatusChange={changeArticleStatus} onComment={addArticleComment} onRestoreVersion={restoreArticleVersion} />}
        {effectiveView === 'spaces' && <SpacesView spaces={spaces} articles={articles} role={role} selectedSpaceName={selectedSpaceName} createOpen={isSpaceCreateOpen} onSelectSpace={setSelectedSpaceName} onCreateOpenChange={setIsSpaceCreateOpen} onOpenArticle={openArticle} onAddKnowledge={(spaceName) => { setCreateSpace(spaceName); setIsAddKnowledgeOpen(true) }} onCreateSpace={createSpaceItem} />}
        {effectiveView === 'questions' && <QuestionsView questions={questions} role={role} initialSpace={knowledgeSpaceContext} onQuestionsChange={setQuestions} />}
        {effectiveView === 'help' && <HelpCenter onNavigate={setActiveView} />}
        {effectiveView === 'analytics' && <AnalyticsView articles={articles} zeroResultQueries={zeroResultQueries} />}
        {effectiveView === 'people' && <AdminView mode="people" role={role} users={users} events={auditEvents} spaces={adminSpaces} usersLoading={adminDataLoading} usersError={adminDataError} settings={settings} onSettingsChange={setSettings} onInvite={inviteUser} onUpdateUser={updateUser} onSetUserStatus={setUserStatus} onDeleteUser={deleteUser} />}
        {effectiveView === 'settings' && <AdminView mode="settings" role={role} users={users} events={auditEvents} spaces={adminSpaces} usersLoading={adminDataLoading} usersError={adminDataError} settings={settings} onSettingsChange={setSettings} onInvite={inviteUser} onUpdateUser={updateUser} onSetUserStatus={setUserStatus} onDeleteUser={deleteUser} />}
        {effectiveView === 'audit' && <AdminView mode="audit" role={role} users={users} events={auditEvents} spaces={adminSpaces} usersLoading={adminDataLoading} usersError={adminDataError} settings={settings} onSettingsChange={setSettings} onInvite={inviteUser} onUpdateUser={updateUser} onSetUserStatus={setUserStatus} onDeleteUser={deleteUser} />}
      </Suspense></main>
    </div>
    <CreateArticleDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onCreate={addArticle} author="Atlas Admin" initialSpace={createSpace} />
    <AddKnowledgeDialog open={isAddKnowledgeOpen} onOpenChange={setIsAddKnowledgeOpen} onSelect={handleKnowledgeAction} space={selectedSpaceName ?? createSpace ?? 'Engineering'} />
    <KnowledgeAssetDialog open={isAssetOpen} onOpenChange={setIsAssetOpen} onCreate={addKnowledgeAsset} spaces={spaces} initialSpace={knowledgeSpaceContext} />
    <KnowledgeSourceDialog open={isSourceOpen} onOpenChange={setIsSourceOpen} onCreate={addKnowledgeIntegration} initialSpace={knowledgeSpaceContext} />
  </div>
}

function AnalyticsView({ articles, zeroResultQueries }: { articles: Article[]; zeroResultQueries: string[] }) {
  const bars = [38, 58, 46, 74, 61, 88, 70, 96, 65, 81, 57, 91]
  return <section className="page-section"><div className="page-heading"><div><div className="eyebrow">WORKSPACE INSIGHTS</div><h1>Knowledge analytics</h1><p>See what your team is learning, sharing, and still looking for.</p></div><button className="date-filter" type="button">Last 30 days <span>⌄</span></button></div>
    <div className="metric-grid analytics-summary"><article className="metric-card"><div className="metric-top"><span>Article views</span><span className="metric-icon tone-blue"><FileText size={17} /></span></div><div className="metric-value">18,492</div><div className="metric-delta">↗ 12.8% from last month</div></article><article className="metric-card"><div className="metric-top"><span>Search success</span><span className="metric-icon tone-mint"><Search size={17} /></span></div><div className="metric-value">92.4%</div><div className="metric-delta">↗ 3.2% from last month</div></article><article className="metric-card"><div className="metric-top"><span>Unanswered searches</span><span className="metric-icon tone-peach"><AlertCircle size={17} /></span></div><div className="metric-value">137</div><div className="metric-delta">↘ 8.1% from last month</div></article></div>
    <div className="analytics-grid"><article className="panel traffic-panel"><div className="panel-heading"><div><h2>Knowledge activity</h2><p>Views and contributions over time</p></div><span className="chart-legend"><i /> Views</span></div><div className="bar-chart" aria-label="Article views over the last twelve weeks">{bars.map((height, index) => <div className="chart-column" key={index}><span style={{ height: `${height}%` }} /><small>W{index + 1}</small></div>)}</div></article>
      <article className="panel search-gaps-panel"><div className="panel-heading"><div><h2>Search gaps</h2><p>Queries without a useful result</p></div><span className="count-label">{137 + zeroResultQueries.length} total</span></div>{[...zeroResultQueries, 'vpn access for contractors', 'travel policy exception', 'rotate staging credentials'].slice(0, 4).map((query, index) => <div className="gap-row" key={query}><span>{query}</span><strong>{[1, 24, 18, 12][index]}</strong></div>)}</article></div>
    <div className="section-title-row"><div><h2>Most viewed articles</h2><p>Content your team returns to most</p></div><span className="muted-count">{articles.length} tracked</span></div><KnowledgeTable articles={articles.slice(0, 4)} role="Super Admin" title="" description="" compact />
  </section>
}

export default App
