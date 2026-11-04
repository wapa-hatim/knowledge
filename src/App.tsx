import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AlertCircle, BookOpenText, Eye, EyeOff, FileText, LoaderCircle } from 'lucide-react'
import { Sidebar } from './components/shell/Sidebar'
import { Topbar } from './components/shell/Topbar'
import { Dashboard } from './features/dashboard/Dashboard'
import { CreateArticleDialog } from './features/knowledge/CreateArticleDialog'
import { PasswordChangeForm } from './features/account/PasswordChangeForm'
import { KnowledgeTable } from './features/knowledge/KnowledgeTable'
import { AddKnowledgeDialog, type KnowledgeAction } from './features/knowledge/AddKnowledgeDialog'
import { KnowledgeAssetDialog } from './features/knowledge/KnowledgeAssetDialog'
import { KnowledgeSourceDialog } from './features/knowledge/KnowledgeSourceDialog'
import { KnowledgeModelsHub } from './features/knowledge/KnowledgeModelsHub'
import { Button } from './components/ui/Button'
import { parseViewCount } from './utils/articleMetrics'
import HelpCenter from './features/help/HelpCenter'
import { changeOwnPassword, createIntegrationRecord, createTaxonomyTerm, deleteArticleRecord, deleteSpaceRecord, deleteTaxonomyTerm, getCurrentWorkspaceRole, isSupabaseConfigured, loadArticleDetails, loadCoreWorkspaceData, loadKnowledgeHubData, loadQuestionData, loadSearchGaps, loadWorkspaceAdminData, loadWorkspaceSettings, manageWorkspaceUser, recordAuditEvent, recordSearchGap, resetPassword, saveArticleComment, saveArticleFeedback, saveArticleRecord, saveArticleVersion as saveArticleVersionRecord, saveQuestionChanges, saveSpaceRecord, saveWorkspaceSettings as persistWorkspaceSettings, setArticleBookmark, signInWithEmail, signOut, supabase, uploadKnowledgeFile } from './lib/supabase'
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

const routePaths: Record<View, string> = {
  overview: '/dashboard',
  library: '/library',
  models: '/models',
  reviews: '/reviews',
  questions: '/questions',
  analytics: '/analytics',
  spaces: '/spaces',
  people: '/people',
  settings: '/settings',
  audit: '/audit',
  search: '/search',
  article: '/articles',
  question: '/questions',
  help: '/help',
}

function resolveAppPath(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (path === '/') return { view: 'overview' as View, articleId: null, isLogin: true, isValid: true }

  const articleMatch = path.match(/^\/articles\/([^/]+)$/)
  if (articleMatch) return { view: 'article' as View, articleId: decodeURIComponent(articleMatch[1]), isLogin: false, isValid: true }

  const view = (Object.entries(routePaths).find(([key, route]) => key !== 'article' && key !== 'question' && route === path)?.[0] ?? null) as View | null
  return { view: view ?? 'overview', articleId: null, isLogin: false, isValid: view !== null }
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
  const [authUserId, setAuthUserId] = useState<string | null>(null)
  const [activeView, setActiveView] = useState<View>(() => resolveAppPath(window.location.pathname).view)
  const [isLoggedOut, setIsLoggedOut] = useState(true)
  const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseConfigured)
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false)
  const [passwordSetupRequired, setPasswordSetupRequired] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isAddKnowledgeOpen, setIsAddKnowledgeOpen] = useState(false)
  const [isAssetOpen, setIsAssetOpen] = useState(false)
  const [isSourceOpen, setIsSourceOpen] = useState(false)
  const [isSpaceCreateOpen, setIsSpaceCreateOpen] = useState(false)
  const [createSpace, setCreateSpace] = useState('')
  const [selectedSpaceName, setSelectedSpaceName] = useState<string | null>(null)
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(() => resolveAppPath(window.location.pathname).articleId)
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
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [hubDataLoading, setHubDataLoading] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [searchGapsLoading, setSearchGapsLoading] = useState(false)
  const [loadedSections, setLoadedSections] = useState<Set<string>>(() => new Set())
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [zeroResultQueries, setZeroResultQueries] = useState<string[]>([])
  const [settings, setSettings] = useState<WorkspaceSettings>(defaultSettings)
  const [knowledgeAssets, setKnowledgeAssets] = useState<KnowledgeAsset[]>([])
  const [knowledgeModels, setKnowledgeModels] = useState<KnowledgeModel[]>([])
  const [knowledgeIntegrations, setKnowledgeIntegrations] = useState<KnowledgeIntegration[]>([])
  const [taxonomyTerms, setTaxonomyTerms] = useState<string[]>([])
  const activeUserIdRef = useRef<string | null>(null)
  const loadedSectionsRef = useRef(new Set<string>())
  const pendingSectionsRef = useRef(new Set<string>())
  const isMountedRef = useRef(false)
  const selectedArticle = articles.find((article) => article.id === selectedArticleId)
  const selectedArticleBody = selectedArticle?.body
  const knowledgeSpaceContext = selectedSpaceName ?? createSpace ?? spaces[0]?.name ?? ''
  const visibleArticles = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return articles
    return articles.filter((article) => [article.title, article.summary, article.body, article.space, article.category, article.owner, ...article.tags].join(' ').toLowerCase().includes(query))
  }, [articles, search])

  const navigateToView = (view: View) => {
    const destination = view === 'article' ? 'library' : view === 'question' ? 'questions' : view
    window.history.pushState({}, '', routePaths[destination])
    setSelectedArticleId(null)
    setActiveView(destination)
  }

  useEffect(() => {
    if (isAuthLoading) return
    const syncRoute = () => {
      const route = resolveAppPath(window.location.pathname)
      if (passwordSetupRequired) {
        if (window.location.pathname !== '/set-password') window.history.replaceState({}, '', '/set-password')
        return
      }
      if (isLoggedOut) {
        if (window.location.pathname !== '/') window.history.replaceState({}, '', '/')
        setActiveView('overview')
        setSelectedArticleId(null)
        return
      }
      if (route.isLogin || !route.isValid || !roleViews[role].includes(route.view)) {
        window.history.replaceState({}, '', '/dashboard')
        setActiveView('overview')
        setSelectedArticleId(null)
        return
      }
      setActiveView(route.view)
      setSelectedArticleId(route.articleId)
    }
    syncRoute()
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [isAuthLoading, isLoggedOut, passwordSetupRequired, role])

  useEffect(() => {
    const client = supabase
    if (!client) return
    isMountedRef.current = true
    const clearWorkspace = () => {
      setAuthUserId(null)
      setCurrentUserName('')
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
      setWorkspaceDataError(null)
      setSettings(defaultSettings)
      setPasswordSetupRequired(false)
      setPasswordDialogOpen(false)
      setWorkspaceDataLoading(false)
      setAdminDataLoading(false)
      setQuestionsLoading(false)
      setHubDataLoading(false)
      setSettingsLoading(false)
      setSearchGapsLoading(false)
      loadedSectionsRef.current.clear()
      pendingSectionsRef.current.clear()
      setLoadedSections(new Set())
    }
    const syncSession = async (session: Awaited<ReturnType<typeof client.auth.getSession>>['data']['session'], forcePasswordSetup = false) => {
      if (!isMountedRef.current) return
      if (!session) {
        activeUserIdRef.current = null
        clearWorkspace()
        setRole('Viewer')
        setIsLoggedOut(true)
        setPasswordSetupRequired(false)
        setIsAuthLoading(false)
        return
      }

      if (activeUserIdRef.current === session.user.id && !forcePasswordSetup && window.location.pathname !== '/set-password') return
      if (activeUserIdRef.current && activeUserIdRef.current !== session.user.id) clearWorkspace()
      activeUserIdRef.current = session.user.id
      const { role: profileRole, userId, userName, passwordSetupRequired: profileRequiresPasswordSetup, error } = await getCurrentWorkspaceRole(session.user.id)
      if (!isMountedRef.current || activeUserIdRef.current !== session.user.id) return
      if (error || !profileRole || !userId) {
        activeUserIdRef.current = null
        clearWorkspace()
        setWorkspaceDataError(error ?? 'Your workspace profile could not be loaded.')
        setIsLoggedOut(true)
        setIsAuthLoading(false)
        return
      }

      const nextRole = resolveRoleFromMetadata(profileRole)
      setRole(nextRole)
      setAuthUserId(userId)
      setCurrentUserName(userName ?? '')
      setIsLoggedOut(false)
      if (forcePasswordSetup || profileRequiresPasswordSetup || window.location.pathname === '/set-password') {
        setPasswordSetupRequired(true)
        setIsAuthLoading(false)
        setWorkspaceDataLoading(false)
        window.history.replaceState({}, '', '/set-password')
        return
      }
      setPasswordSetupRequired(false)
      setIsAuthLoading(false)
      setWorkspaceDataLoading(true)
      const { data: workspaceData, error: workspaceError } = await loadCoreWorkspaceData(userId)
      if (!isMountedRef.current || activeUserIdRef.current !== userId) return
      setArticles(workspaceData?.articles ?? [])
      setSpaces(workspaceData?.spaces ?? [])
      setTaxonomyTerms(workspaceData?.taxonomyTerms ?? [])
      setBookmarks(workspaceData?.bookmarks ?? [])
      setAuditEvents(workspaceData?.events ?? [])
      setQuestions([])
      setKnowledgeAssets([])
      setKnowledgeModels([])
      setKnowledgeIntegrations([])
      setZeroResultQueries([])
      setUsers([])
      setAdminSpaces([])
      setCreateSpace(workspaceData?.spaces[0]?.name ?? '')
      setWorkspaceDataError(workspaceError)
      setWorkspaceDataLoading(false)
    }

    void client.auth.getSession().then(({ data }) => {
      return syncSession(data.session)
    }).catch(() => {
      if (!isMountedRef.current) return
      setIsLoggedOut(true)
      setWorkspaceDataError('Unable to load your Supabase session.')
      setIsAuthLoading(false)
    })

    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      window.setTimeout(() => {
        void syncSession(session, event === 'PASSWORD_RECOVERY')
      }, 0)
    })

    return () => {
      isMountedRef.current = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (effectiveView !== 'questions' || !authUserId || loadedSections.has('questions') || pendingSectionsRef.current.has('questions')) return
    pendingSectionsRef.current.add('questions')
    setQuestionsLoading(true)
    void loadQuestionData().then(({ data, error }) => {
      if (activeUserIdRef.current !== authUserId) return
      if (error || !data) setWorkspaceDataError(error ?? 'Could not load questions.')
      else {
        setQuestions(data)
        loadedSectionsRef.current.add('questions')
        setLoadedSections((current) => new Set(current).add('questions'))
      }
    }).finally(() => {
      pendingSectionsRef.current.delete('questions')
      if (activeUserIdRef.current === authUserId) setQuestionsLoading(false)
    })
  }, [effectiveView, authUserId, loadedSections])

  useEffect(() => {
    if (effectiveView !== 'models' || !authUserId || loadedSections.has('hub') || pendingSectionsRef.current.has('hub')) return
    pendingSectionsRef.current.add('hub')
    setHubDataLoading(true)
    void loadKnowledgeHubData(role).then(({ data, error }) => {
      if (activeUserIdRef.current !== authUserId) return
      if (error || !data) setWorkspaceDataError(error ?? 'Could not load knowledge models.')
      else {
        setKnowledgeAssets(data.assets)
        setKnowledgeModels(data.models)
        setKnowledgeIntegrations(data.integrations)
        setTaxonomyTerms(data.taxonomyTerms)
        loadedSectionsRef.current.add('hub')
        setLoadedSections((current) => new Set(current).add('hub'))
      }
    }).finally(() => {
      pendingSectionsRef.current.delete('hub')
      if (activeUserIdRef.current === authUserId) setHubDataLoading(false)
    })
  }, [effectiveView, authUserId, role, loadedSections])

  useEffect(() => {
    if (!authUserId || (effectiveView !== 'people' && effectiveView !== 'audit')) return
    if (role !== 'Super Admin') return
    const adminMode = effectiveView === 'audit' ? 'audit' : 'people'
    const sectionKey = `admin:${adminMode}`
    if (loadedSections.has(sectionKey) || pendingSectionsRef.current.has(sectionKey)) return
    pendingSectionsRef.current.add(sectionKey)
    setAdminDataLoading(true)
    void loadWorkspaceAdminData(adminMode).then(({ data, error }) => {
      if (activeUserIdRef.current !== authUserId) return
      if (adminMode === 'people') {
        setUsers(data?.users ?? [])
        setAdminSpaces(data?.spaces ?? [])
      } else {
        setAuditEvents(data?.events ?? [])
      }
      setAdminDataError(error)
      if (!error) {
        loadedSectionsRef.current.add(sectionKey)
        setLoadedSections((current) => new Set(current).add(sectionKey))
      }
    }).finally(() => {
      pendingSectionsRef.current.delete(sectionKey)
      if (activeUserIdRef.current === authUserId) setAdminDataLoading(false)
    })
  }, [effectiveView, authUserId, role, loadedSections])

  useEffect(() => {
    if (effectiveView !== 'settings' || !authUserId || loadedSections.has('settings') || pendingSectionsRef.current.has('settings')) return
    pendingSectionsRef.current.add('settings')
    setSettingsLoading(true)
    void loadWorkspaceSettings().then(({ data, error }) => {
      if (activeUserIdRef.current !== authUserId) return
      if (error || !data) setWorkspaceDataError(error ?? 'Could not load workspace settings.')
      else {
        setSettings(data)
        loadedSectionsRef.current.add('settings')
        setLoadedSections((current) => new Set(current).add('settings'))
      }
    }).finally(() => {
      pendingSectionsRef.current.delete('settings')
      if (activeUserIdRef.current === authUserId) setSettingsLoading(false)
    })
  }, [effectiveView, authUserId, loadedSections])

  useEffect(() => {
    if (effectiveView !== 'analytics' || !authUserId || loadedSections.has('search-gaps') || pendingSectionsRef.current.has('search-gaps')) return
    pendingSectionsRef.current.add('search-gaps')
    setSearchGapsLoading(true)
    void loadSearchGaps().then(({ data, error }) => {
      if (activeUserIdRef.current !== authUserId) return
      if (error || !data) setWorkspaceDataError(error ?? 'Could not load search analytics.')
      else {
        setZeroResultQueries(data)
        loadedSectionsRef.current.add('search-gaps')
        setLoadedSections((current) => new Set(current).add('search-gaps'))
      }
    }).finally(() => {
      pendingSectionsRef.current.delete('search-gaps')
      if (activeUserIdRef.current === authUserId) setSearchGapsLoading(false)
    })
  }, [effectiveView, authUserId, loadedSections])

  useEffect(() => {
    if (!selectedArticleId || !authUserId || selectedArticleBody !== undefined) return
    void loadArticleDetails(selectedArticleId).then(({ data, error }) => {
      if (activeUserIdRef.current !== authUserId) return
      if (error || !data) setWorkspaceDataError(error ?? 'Could not load this article.')
      else setArticles((current) => current.map((article) => article.id === selectedArticleId ? { ...article, ...data } : article))
    })
  }, [selectedArticleId, selectedArticleBody, authUserId])

  const addEvent = (actor: string, action: string, target: string, type: AuditEvent['type']) => {
    void recordAuditEvent(actor, action, target, type).then(({ data, error }) => {
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
    navigateToView('library')
    return null
  }
  const handleKnowledgeAction = (action: KnowledgeAction) => {
    if (action === 'article') openCreateForSpace(knowledgeSpaceContext)
    if (action === 'asset') setIsAssetOpen(true)
    if (action === 'metadata' || action === 'ai-context') navigateToView('models')
    if (action === 'question') navigateToView('questions')
    if (action === 'source') setIsSourceOpen(true)
  }
  const addKnowledgeAsset = async (asset: KnowledgeAsset, file: File) => {
    const { data, error } = await uploadKnowledgeFile(file, asset.space, asset.kind)
    if (error || !data) return error ?? 'The file could not be uploaded.'
    setKnowledgeAssets((current) => [data, ...current])
    setIsAssetOpen(false)
    addEvent(currentUserName, 'Added knowledge asset', asset.name, 'Content')
    navigateToView('models')
    return null
  }
  const addKnowledgeIntegration = async (integration: KnowledgeIntegration) => {
    const { error } = await createIntegrationRecord(integration)
    if (error) {
      setWorkspaceDataError(error)
      return error
    }
    setKnowledgeIntegrations((current) => [integration, ...current])
    setIsSourceOpen(false)
    addEvent(currentUserName, 'Added source connector', integration.name, 'Workspace')
    navigateToView('models')
    return null
  }
  const addTaxonomyTerm = async (term: string) => {
    if (taxonomyTerms.includes(term)) return null
    const { error } = await createTaxonomyTerm(term)
    if (error) return error
    setTaxonomyTerms((current) => [...current, term])
    addEvent(currentUserName, 'Added taxonomy term', `#${term}`, 'Workspace')
    return null
  }
  const removeTaxonomyTerm = async (term: string) => {
    const { error } = await deleteTaxonomyTerm(term)
    if (error) return error
    setTaxonomyTerms((current) => current.filter((existing) => existing !== term))
    addEvent(currentUserName, 'Removed taxonomy term', `#${term}`, 'Workspace')
    return null
  }
  const changeWorkspaceSettings = async (nextSettings: WorkspaceSettings) => {
    const { error } = await persistWorkspaceSettings(nextSettings)
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
    window.history.pushState({}, '', `${routePaths.article}/${encodeURIComponent(article.id)}`)
  }
  const updateArticle = (id: string, update: (article: Article) => Article) => setArticles((current) => current.map((article) => article.id === id ? update(article) : article))
  const autosaveArticle = async (body: string) => {
    if (!selectedArticle) return false
    const updatedArticle = { ...selectedArticle, body, updated: 'Just now' }
    const { error } = await saveArticleRecord(updatedArticle)
    if (error) {
      setWorkspaceDataError(error)
      return false
    }
    updateArticle(selectedArticle.id, () => updatedArticle)
    return true
  }
  const saveArticleVersion = async (body: string) => {
    if (!selectedArticle) return false
    const { error } = await saveArticleVersionRecord(selectedArticle, body)
    if (error) {
      setWorkspaceDataError(error)
      return false
    }
    const version: ArticleVersion = { id: crypto.randomUUID(), title: selectedArticle.title, body, status: selectedArticle.status, author: selectedArticle.owner, savedAt: formatTimestamp() }
    updateArticle(selectedArticle.id, (article) => ({ ...article, body, versions: [version, ...(article.versions ?? [])] }))
    addEvent(currentUserName, 'Saved version', selectedArticle.title, 'Content')
    return true
  }
  const updateArticleTags = async (tags: string[]) => {
    if (!selectedArticle) return false
    const updatedArticle = { ...selectedArticle, tags, updated: 'Just now' }
    const { error } = await saveArticleRecord(updatedArticle)
    if (error) {
      setWorkspaceDataError(error)
      return false
    }
    updateArticle(selectedArticle.id, () => updatedArticle)
    return true
  }
  const changeArticleStatus = async (status: ArticleStatus) => {
    if (!selectedArticle) return false
    const updatedArticle = { ...selectedArticle, status, updated: 'Just now' }
    const { error } = await saveArticleRecord(updatedArticle)
    if (error) {
      setWorkspaceDataError(error)
      return false
    }
    updateArticle(selectedArticle.id, () => updatedArticle)
    addEvent(currentUserName, `${status === 'Under review' ? 'Requested review for' : status === 'Published' ? 'Published' : 'Archived'}`, selectedArticle.title, 'Content')
    return true
  }
  const addArticleComment = async (comment: ArticleComment) => {
    if (!selectedArticle) return false
    const { error } = await saveArticleComment(selectedArticle.id, comment.body)
    if (error) {
      setWorkspaceDataError(error)
      return false
    }
    updateArticle(selectedArticle.id, (article) => ({ ...article, comments: [...(article.comments ?? []), comment] }))
    return true
  }
  const addArticleFeedback = async (helpful: boolean, feedback: string) => {
    if (!selectedArticle) return false
    const { error } = await saveArticleFeedback(selectedArticle.id, helpful, feedback)
    if (error) {
      setWorkspaceDataError(error)
      return false
    }
    return true
  }
  const restoreArticleVersion = async (version: ArticleVersion) => {
    if (!selectedArticle) return false
    const updatedArticle = { ...selectedArticle, body: version.body, status: version.status, updated: 'Just now' }
    const { error } = await saveArticleRecord(updatedArticle)
    if (error) {
      setWorkspaceDataError(error)
      return false
    }
    updateArticle(selectedArticle.id, () => updatedArticle)
    addEvent(currentUserName, 'Restored version', selectedArticle.title, 'Content')
    return true
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
    navigateToView('library')
    addEvent(currentUserName, 'Deleted article', selectedArticle.title, 'Content')
  }
  const updateUser = async (user: WorkspaceUser) => {
    const { error } = await manageWorkspaceUser('update', { member: user })
    if (error) return error
    setUsers((current) => current.map((existing) => existing.id === user.id ? user : existing))
    loadedSectionsRef.current.delete('admin:people')
    setLoadedSections((current) => { const next = new Set(current); next.delete('admin:people'); return next })
    return null
  }
  const inviteUser = async (user: Omit<WorkspaceUser, 'id'>) => {
    const { data: result, error } = await manageWorkspaceUser('invite', { member: user })
    if (error) return error
    const member = (result as { member?: WorkspaceUser } | null)?.member
    if (member) setUsers((current) => [member, ...current])
    loadedSectionsRef.current.delete('admin:people')
    setLoadedSections((current) => { const next = new Set(current); next.delete('admin:people'); return next })
    return null
  }
  const setUserStatus = async (userId: string, status: WorkspaceUser['status']) => {
    const { error } = await manageWorkspaceUser('status', { userId, status })
    if (error) return error
    setUsers((current) => current.map((user) => user.id === userId ? { ...user, status } : user))
    loadedSectionsRef.current.delete('admin:people')
    setLoadedSections((current) => { const next = new Set(current); next.delete('admin:people'); return next })
    return null
  }
  const deleteUser = async (userId: string) => {
    const { error } = await manageWorkspaceUser('delete', { userId })
    if (error) return error
    setUsers((current) => current.filter((user) => user.id !== userId))
    loadedSectionsRef.current.delete('admin:people')
    setLoadedSections((current) => { const next = new Set(current); next.delete('admin:people'); return next })
    return null
  }
  const openCreateForSpace = (spaceName: string) => {
    setCreateSpace(spaceName || spaces[0]?.name || '')
    setIsCreateOpen(true)
  }
  const openSpace = (spaceName: string) => {
    setSelectedSpaceName(spaceName)
    navigateToView('spaces')
  }
  const openSpaceCreator = () => {
    setSelectedSpaceName(null)
    navigateToView('spaces')
    setIsSpaceCreateOpen(true)
  }
  const saveSpaceItem = async (space: KnowledgeSpace, previousName: string | null = null) => {
    const { error } = await saveSpaceRecord(previousName, space)
    if (error) {
      setWorkspaceDataError(error)
      return error
    }
    setSpaces((current) => previousName
      ? current.map((existing) => existing.name === previousName ? space : existing)
      : [...current, space])
    if (selectedSpaceName === previousName) setSelectedSpaceName(space.name)
    addEvent(currentUserName, previousName ? 'Updated space' : 'Created space', space.name, 'Workspace')
    return null
  }
  const removeSpaceItem = async (spaceName: string) => {
    const { error } = await deleteSpaceRecord(spaceName)
    if (error) {
      setWorkspaceDataError(error)
      return error
    }
    setSpaces((current) => current.filter((space) => space.name !== spaceName))
    setArticles((current) => current.filter((article) => article.space !== spaceName))
    setQuestions((current) => current.filter((question) => question.space !== spaceName))
    setKnowledgeAssets((current) => current.filter((asset) => asset.space !== spaceName))
    if (selectedSpaceName === spaceName) {
      setSelectedSpaceName(null)
      navigateToView('spaces')
    }
    addEvent(currentUserName, 'Deleted space', spaceName, 'Workspace')
    return null
  }
  const savePassword = async (password: string, currentPassword?: string) => {
    const { error } = await changeOwnPassword(password, currentPassword)
    if (error) return error
    if (passwordSetupRequired) {
      const { error: completionError } = await manageWorkspaceUser('complete-password-setup', {})
      if (completionError) return completionError
      setPasswordSetupRequired(false)
      window.location.replace(routePaths.overview)
    } else {
      setPasswordDialogOpen(false)
    }
    return null
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
      const { role: profileRole, userId, userName, passwordSetupRequired: mustSetPassword, error: profileError } = await getCurrentWorkspaceRole(data.user.id)
      if (profileError || !profileRole) {
        await signOut()
        setResetNotice(profileError ?? 'Your workspace profile is not set up yet. Ask an administrator to provision your account.')
        return
      }
      setRole(resolveRoleFromMetadata(profileRole))
      setAuthUserId(userId ?? data.user.id)
      setCurrentUserName(userName ?? '')
      setIsLoggedOut(false)
      setPasswordSetupRequired(Boolean(mustSetPassword))
      if (mustSetPassword) {
        window.history.replaceState({}, '', '/set-password')
      } else {
        setActiveView('overview')
        setSelectedArticleId(null)
        window.history.replaceState({}, '', routePaths.overview)
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

  const adminPageLoading = adminDataLoading || Boolean(authUserId && !adminDataError && ((effectiveView === 'people' && !loadedSections.has('admin:people')) || (effectiveView === 'audit' && !loadedSections.has('admin:audit'))))
  const questionsPageLoading = questionsLoading || Boolean(authUserId && !workspaceDataError && effectiveView === 'questions' && !loadedSections.has('questions'))
  const hubPageLoading = hubDataLoading || Boolean(authUserId && !workspaceDataError && effectiveView === 'models' && !loadedSections.has('hub'))
  const settingsPageLoading = settingsLoading || Boolean(authUserId && !workspaceDataError && effectiveView === 'settings' && !loadedSections.has('settings'))
  const searchGapsPageLoading = searchGapsLoading || Boolean(authUserId && !workspaceDataError && effectiveView === 'analytics' && !loadedSections.has('search-gaps'))
  const articlePageLoading = Boolean(authUserId && selectedArticle && selectedArticle.body === undefined)

  if (passwordSetupRequired) return <main className="signed-out-screen"><section className="signed-out-panel"><div className="brand-mark"><BookOpenText size={19} /></div><div className="eyebrow">SECURE YOUR ACCOUNT</div><h1>Set your password.</h1><p>Choose a password before continuing to your workspace.</p><PasswordChangeForm requireCurrentPassword={false} submitLabel="Set password" onSave={savePassword} /></section></main>

  if (isAuthLoading) return <main className="signed-out-screen"><section className="signed-out-panel auth-loading-panel" role="status"><div className="brand-mark"><BookOpenText size={19} /></div><LoaderCircle className="auth-loading-spinner" size={20} /><p>Checking your session…</p></section></main>
  if (isLoggedOut) return <main className="signed-out-screen"><form className="signed-out-panel" onSubmit={submitLogin}><div className="brand-mark"><BookOpenText size={19} /></div><div className="eyebrow">ATLAS KNOWLEDGE WORKSPACE</div><h1>Welcome back.</h1><p>Sign in with your organization account to continue.</p><label htmlFor="login-email">Work email</label><input id="login-email" type="email" autoComplete="username" placeholder="name@company.com" required disabled={isSubmittingLogin} /><label htmlFor="login-password">Password</label><div className="login-password-field"><input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" required disabled={isSubmittingLogin} /><button type="button" className="password-visibility-button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} disabled={isSubmittingLogin}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div><div className="auth-actions"><button className="auth-utility-link" type="button" onClick={() => setPasswordResetOpen(true)} disabled={isSubmittingLogin}>Forgot password?</button></div><Button type="submit" disabled={isSubmittingLogin}>{isSubmittingLogin ? <><LoaderCircle className="auth-loading-spinner" size={15} />Signing in…</> : 'Sign in'}</Button>{resetNotice && <span className="auth-reset-note" role="alert">{resetNotice}</span>}</form><Dialog.Root open={passwordResetOpen} onOpenChange={setPasswordResetOpen}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="create-dialog logout-dialog"><div className="dialog-heading"><Dialog.Title>Reset your password</Dialog.Title><Dialog.Description>We’ll send a reset link to your work email so you can regain access.</Dialog.Description></div><form onSubmit={requestPasswordReset}><label htmlFor="reset-email">Work email</label><input id="reset-email" type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder="name@company.com" required /><div className="dialog-actions"><Dialog.Close asChild><Button variant="ghost" type="button">Cancel</Button></Dialog.Close><Button type="submit">Send reset link</Button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root></main>

  return <div className="app-shell">
    <Sidebar activeView={effectiveView} onNavigate={navigateToView} role={role} userName={currentUserName} spaces={spaces} reviewCount={articles.filter((article) => article.status === 'Under review').length} selectedSpaceName={selectedSpaceName} onSelectSpace={setSelectedSpaceName} onOpenSpace={openSpace} onCreateSpace={openSpaceCreator} />
    <div className="app-main">
      <Topbar role={role} userName={currentUserName} activeView={effectiveView} search={search} onSearch={setSearch} onSearchSubmit={() => navigateToView('search')} onAskAtlas={() => navigateToView('questions')} onAddKnowledge={() => setIsAddKnowledgeOpen(true)} onChangePassword={() => setPasswordDialogOpen(true)} onLogout={async () => {
        const { error } = await signOut()
        if (error) setResetNotice(error)
        setIsLoggedOut(true)
        setActiveView('overview')
        setSelectedArticleId(null)
        window.history.replaceState({}, '', '/')
      }} />
      <main className="page-content">{workspaceDataError && <div className="admin-data-error" role="alert">Supabase request failed: {workspaceDataError}</div>}{workspaceDataLoading ? <div className="page-loading" role="status"><LoaderCircle className="auth-loading-spinner" size={18} /> Loading workspace data…</div> : <Suspense fallback={<div className="page-loading" role="status">Loading workspace…</div>}>
        {effectiveView === 'overview' && <Dashboard role={role} userName={currentUserName} articles={visibleArticles} events={auditEvents} onNavigate={navigateToView} onNewArticle={() => setIsAddKnowledgeOpen(true)} onOpenArticle={openArticle} />}
        {effectiveView === 'library' && <KnowledgeTable articles={visibleArticles} role={role} currentUserName={currentUserName} title="Knowledge library" description="Browse the documents, playbooks, and answers shared across your workspace." onNewArticle={() => setIsAddKnowledgeOpen(true)} onOpenArticle={openArticle} />}
        {effectiveView === 'models' && <KnowledgeModelsHub models={knowledgeModels} loading={hubPageLoading} assets={knowledgeAssets} integrations={knowledgeIntegrations} taxonomyTerms={taxonomyTerms} canManageTaxonomy={role === 'Super Admin' || role === 'Space Admin'} onNavigate={navigateToView} onCreateArticle={() => openCreateForSpace(spaces[0]?.name ?? '')} onCreateAsset={() => setIsAssetOpen(true)} onCreateSource={() => setIsSourceOpen(true)} onAddTaxonomyTerm={addTaxonomyTerm} onRemoveTaxonomyTerm={removeTaxonomyTerm} />}
        {effectiveView === 'reviews' && <KnowledgeTable articles={visibleArticles} role={role} currentUserName={currentUserName} title="Review queue" description="Keep trusted knowledge moving with timely, thoughtful reviews." initialFilter="review" onNewArticle={() => openCreateForSpace(spaces[0]?.name ?? '')} onOpenArticle={openArticle} />}
        {effectiveView === 'search' && <SearchResults articles={articles} query={search} onQueryChange={setSearch} onOpenArticle={openArticle} onSaveZeroResult={saveZeroResult} />}
        {effectiveView === 'article' && articlePageLoading && <div className="page-loading" role="status">Loading article…</div>}
        {effectiveView === 'article' && selectedArticle && !articlePageLoading && <ArticleDetail article={selectedArticle} role={role} currentUserName={currentUserName} bookmarked={bookmarks.includes(selectedArticle.id)} taxonomyTerms={taxonomyTerms} onBack={() => navigateToView('library')} onBookmark={() => toggleBookmark(selectedArticle.id)} onTagsChange={updateArticleTags} onAutosave={autosaveArticle} onSaveVersion={saveArticleVersion} onStatusChange={changeArticleStatus} onComment={addArticleComment} onFeedback={addArticleFeedback} onRestoreVersion={restoreArticleVersion} onDelete={removeArticle} />}
        {effectiveView === 'spaces' && <SpacesView spaces={spaces} articles={articles} role={role} selectedSpaceName={selectedSpaceName} createOpen={isSpaceCreateOpen} onSelectSpace={setSelectedSpaceName} onCreateOpenChange={setIsSpaceCreateOpen} onOpenArticle={openArticle} onAddKnowledge={(spaceName) => { setCreateSpace(spaceName); setIsAddKnowledgeOpen(true) }} onSaveSpace={saveSpaceItem} onDeleteSpace={removeSpaceItem} />}
        {effectiveView === 'questions' && <QuestionsView questions={questions} spaces={spaces} role={role} currentUserName={currentUserName} loading={questionsPageLoading} initialSpace={knowledgeSpaceContext} onQuestionsChange={changeQuestions} />}
        {effectiveView === 'help' && <HelpCenter onNavigate={navigateToView} />}
        {effectiveView === 'analytics' && <AnalyticsView articles={articles} role={role} currentUserName={currentUserName} zeroResultQueries={zeroResultQueries} loading={searchGapsPageLoading} />}
        {effectiveView === 'people' && (adminPageLoading ? <div className="page-loading" role="status">Loading workspace members…</div> : <AdminView mode="people" role={role} users={users} events={auditEvents} spaces={adminSpaces} usersLoading={false} usersError={adminDataError} settings={settings} onSettingsChange={changeWorkspaceSettings} onInvite={inviteUser} onUpdateUser={updateUser} onSetUserStatus={setUserStatus} onDeleteUser={deleteUser} />)}
        {effectiveView === 'settings' && (settingsPageLoading ? <div className="page-loading" role="status">Loading workspace settings…</div> : <AdminView mode="settings" role={role} users={users} events={auditEvents} spaces={adminSpaces} usersLoading={false} usersError={adminDataError} settings={settings} onSettingsChange={changeWorkspaceSettings} onInvite={inviteUser} onUpdateUser={updateUser} onSetUserStatus={setUserStatus} onDeleteUser={deleteUser} />)}
        {effectiveView === 'audit' && (adminPageLoading ? <div className="page-loading" role="status">Loading audit events…</div> : <AdminView mode="audit" role={role} users={users} events={auditEvents} spaces={adminSpaces} usersLoading={false} usersError={adminDataError} settings={settings} onSettingsChange={changeWorkspaceSettings} onInvite={inviteUser} onUpdateUser={updateUser} onSetUserStatus={setUserStatus} onDeleteUser={deleteUser} />)}
      </Suspense>}</main>
    </div>
    <CreateArticleDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onCreate={addArticle} author={currentUserName} spaces={spaces} initialSpace={createSpace} />
    <AddKnowledgeDialog open={isAddKnowledgeOpen} onOpenChange={setIsAddKnowledgeOpen} onSelect={handleKnowledgeAction} space={selectedSpaceName ?? createSpace ?? 'Engineering'} />
    <KnowledgeAssetDialog open={isAssetOpen} onOpenChange={setIsAssetOpen} onCreate={addKnowledgeAsset} spaces={spaces} initialSpace={knowledgeSpaceContext} />
    <KnowledgeSourceDialog open={isSourceOpen} onOpenChange={setIsSourceOpen} onCreate={addKnowledgeIntegration} initialSpace={knowledgeSpaceContext} />
    <Dialog.Root open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="create-dialog"><div className="dialog-heading"><Dialog.Title>Change your password</Dialog.Title><Dialog.Description>Enter your current password and choose a new one with at least 12 characters.</Dialog.Description></div><PasswordChangeForm requireCurrentPassword submitLabel="Save password" onSave={savePassword} onCancel={() => setPasswordDialogOpen(false)} /></Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>
}

function AnalyticsView({ articles, role, currentUserName, zeroResultQueries, loading }: { articles: Article[]; role: Role; currentUserName: string; zeroResultQueries: string[]; loading: boolean }) {
  const statuses = ['Published', 'Under review', 'Draft', 'Archived'].map((status) => ({
    label: status,
    count: articles.filter((article) => article.status === status).length,
  }))
  const maxStatusCount = Math.max(1, ...statuses.map((status) => status.count))
  const totalViews = articles.reduce((total, article) => total + parseViewCount(article.views), 0)
  return <section className="page-section"><div className="page-heading"><div><div className="eyebrow">WORKSPACE INSIGHTS</div><h1>Knowledge analytics</h1><p>See what your team is learning, sharing, and still looking for.</p></div><span className="date-filter">All recorded data</span></div>
    <div className="metric-grid analytics-summary"><article className="metric-card"><div className="metric-top"><span>Article views</span><span className="metric-icon tone-blue"><FileText size={17} /></span></div><div className="metric-value">{totalViews.toLocaleString()}</div><div className="metric-delta">Sum of stored article views</div></article><article className="metric-card"><div className="metric-top"><span>Published articles</span><span className="metric-icon tone-mint"><BookOpenText size={17} /></span></div><div className="metric-value">{statuses[0].count}</div><div className="metric-delta">Current Supabase records</div></article><article className="metric-card"><div className="metric-top"><span>Recorded search gaps</span><span className="metric-icon tone-peach"><AlertCircle size={17} /></span></div><div className="metric-value">{zeroResultQueries.length}</div><div className="metric-delta">No-result searches in Supabase</div></article></div>
    <div className="analytics-grid"><article className="panel traffic-panel"><div className="panel-heading"><div><h2>Articles by status</h2><p>Current records in this workspace</p></div><span className="chart-legend"><i /> Articles</span></div><div className="bar-chart" aria-label="Current articles by status">{statuses.map((status) => <div className="chart-column" key={status.label}><span style={{ height: `${Math.max(4, status.count / maxStatusCount * 100)}%` }} /><small>{status.label}</small></div>)}</div></article>
      <article className="panel search-gaps-panel"><div className="panel-heading"><div><h2>Search gaps</h2><p>Latest queries without a useful result</p></div><span className="count-label">{loading ? 'Loading…' : `${zeroResultQueries.length} total`}</span></div>{loading ? <div className="empty-state">Loading search activity…</div> : zeroResultQueries.slice(0, 4).map((query) => <div className="gap-row" key={query}><span>{query}</span></div>)}{!loading && zeroResultQueries.length === 0 && <div className="empty-state">No recorded search gaps.</div>}</article></div>
    <div className="section-title-row"><div><h2>Most viewed articles</h2><p>Content your team returns to most</p></div><span className="muted-count">{articles.length} tracked</span></div><KnowledgeTable articles={[...articles].sort((first, second) => parseViewCount(second.views) - parseViewCount(first.views)).slice(0, 4)} role={role} currentUserName={currentUserName} title="" description="" compact />
  </section>
}

export default App
