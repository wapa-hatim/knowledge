import { lazy, Suspense, useMemo, useState } from 'react'
import { AlertCircle, FileText, Search } from 'lucide-react'
import { Sidebar } from './components/shell/Sidebar'
import { Topbar } from './components/shell/Topbar'
import { Dashboard } from './features/dashboard/Dashboard'
import { CreateArticleDialog } from './features/knowledge/CreateArticleDialog'
import { KnowledgeTable } from './features/knowledge/KnowledgeTable'
import { articleBodies, initialArticles } from './data/knowledge'
import { initialAuditEvents, initialQuestions, initialSpaces, initialUsers } from './data/workspace'
import { usePersistentState } from './hooks/usePersistentState'
import type { Article, ArticleComment, ArticleStatus, ArticleVersion, AuditEvent, KnowledgeQuestion, KnowledgeSpace, Role, View, WorkspaceSettings, WorkspaceUser } from './types'

const ArticleDetail = lazy(() => import('./features/knowledge/ArticleDetail').then((module) => ({ default: module.ArticleDetail })))
const SearchResults = lazy(() => import('./features/knowledge/SearchResults').then((module) => ({ default: module.SearchResults })))
const SpacesView = lazy(() => import('./features/spaces/SpacesView').then((module) => ({ default: module.SpacesView })))
const QuestionsView = lazy(() => import('./features/questions/QuestionsView').then((module) => ({ default: module.QuestionsView })))
const AdminView = lazy(() => import('./features/admin/AdminView').then((module) => ({ default: module.AdminView })))

const roleViews: Record<Role, View[]> = {
  'Super Admin': ['overview', 'library', 'reviews', 'questions', 'analytics', 'spaces', 'people', 'settings', 'audit', 'search', 'article', 'question'],
  'Space Admin': ['overview', 'library', 'reviews', 'questions', 'analytics', 'spaces', 'people', 'settings', 'search', 'article', 'question'],
  Author: ['overview', 'library', 'questions', 'spaces', 'search', 'article', 'question'],
  Reviewer: ['overview', 'library', 'reviews', 'questions', 'spaces', 'search', 'article', 'question'],
  Viewer: ['overview', 'library', 'questions', 'spaces', 'search', 'article', 'question'],
}

const storedArticles = initialArticles.map((article) => ({ ...article, body: articleBodies[article.id] ?? `# ${article.title}\n\n${article.summary}`, reviewDue: 'January 19, 2027' }))
const defaultSettings: WorkspaceSettings = { reviewRequired: true, reviewCadenceMonths: 6, notifyOwners: true, allowGuestQuestions: true, defaultArticleVisibility: 'Space members' }
const createAuditEventId = () => `EV-${Date.now()}`
const createArticleVersionId = () => `V-${Date.now()}`
const formatTimestamp = () => new Date().toLocaleString()

function App() {
  const [role, setRole] = useState<Role>('Super Admin')
  const [activeView, setActiveView] = useState<View>('overview')
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSpaceCreateOpen, setIsSpaceCreateOpen] = useState(false)
  const [createSpace, setCreateSpace] = useState('Engineering')
  const [selectedSpaceName, setSelectedSpaceName] = useState<string | null>(null)
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const [articles, setArticles] = usePersistentState<Article[]>('atlas-articles', storedArticles)
  const [questions, setQuestions] = usePersistentState<KnowledgeQuestion[]>('atlas-questions', initialQuestions)
  const [spaces, setSpaces] = usePersistentState<KnowledgeSpace[]>('atlas-spaces', initialSpaces)
  const [users, setUsers] = usePersistentState<WorkspaceUser[]>('atlas-users', initialUsers)
  const [auditEvents, setAuditEvents] = usePersistentState<AuditEvent[]>('atlas-audit', initialAuditEvents)
  const [bookmarks, setBookmarks] = usePersistentState<string[]>('atlas-bookmarks', [])
  const [zeroResultQueries, setZeroResultQueries] = usePersistentState<string[]>('atlas-search-gaps', [])
  const [settings, setSettings] = usePersistentState<WorkspaceSettings>('atlas-settings', defaultSettings)
  const selectedArticle = articles.find((article) => article.id === selectedArticleId)
  const visibleArticles = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return articles
    return articles.filter((article) => [article.title, article.summary, article.body, article.space, article.category, article.owner, ...article.tags].join(' ').toLowerCase().includes(query))
  }, [articles, search])

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
  const openArticle = (article: Article) => {
    setSelectedArticleId(article.id)
    setActiveView('article')
  }
  const changeRole = (nextRole: Role) => {
    setRole(nextRole)
    if (!roleViews[nextRole].includes(activeView)) setActiveView('overview')
  }
  const updateArticle = (id: string, update: (article: Article) => Article) => setArticles((current) => current.map((article) => article.id === id ? update(article) : article))
  const autosaveArticle = (body: string) => {
    if (selectedArticle) updateArticle(selectedArticle.id, (article) => ({ ...article, body, updated: 'Just now' }))
  }
  const saveArticleVersion = (body: string) => {
    if (!selectedArticle) return
    const version: ArticleVersion = { id: createArticleVersionId(), title: selectedArticle.title, body, status: selectedArticle.status, author: 'Amina Yusuf', savedAt: formatTimestamp() }
    updateArticle(selectedArticle.id, (article) => ({ ...article, body, versions: [version, ...(article.versions ?? [])] }))
    addEvent('Amina Yusuf', 'Saved version', selectedArticle.title, 'Content')
  }
  const changeArticleStatus = (status: ArticleStatus) => {
    if (!selectedArticle) return
    updateArticle(selectedArticle.id, (article) => ({ ...article, status, updated: 'Just now' }))
    addEvent('Amina Yusuf', `${status === 'Under review' ? 'Requested review for' : status === 'Published' ? 'Published' : 'Archived'}`, selectedArticle.title, 'Content')
  }
  const addArticleComment = (comment: ArticleComment) => {
    if (!selectedArticle) return
    updateArticle(selectedArticle.id, (article) => ({ ...article, comments: [...(article.comments ?? []), comment] }))
  }
  const restoreArticleVersion = (version: ArticleVersion) => {
    if (!selectedArticle) return
    updateArticle(selectedArticle.id, (article) => ({ ...article, body: version.body, status: version.status, updated: 'Just now' }))
    addEvent('Amina Yusuf', 'Restored version', selectedArticle.title, 'Content')
  }
  const updateUser = (user: WorkspaceUser) => {
    setUsers((current) => current.map((existing) => existing.id === user.id ? user : existing))
    addEvent('Amina Yusuf', 'Updated member access', `${user.name} · ${user.role} · ${user.status}`, 'Access')
  }
  const inviteUser = (user: WorkspaceUser) => {
    setUsers((current) => [...current, user])
    addEvent('Amina Yusuf', 'Invited member', user.name, 'Access')
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
    addEvent('Amina Yusuf', 'Created space', space.name, 'Workspace')
  }
  const saveZeroResult = (query: string) => {
    setZeroResultQueries((current) => current.includes(query) ? current : [query, ...current])
  }

  return <div className="app-shell">
    <Sidebar activeView={activeView} onNavigate={setActiveView} role={role} spaces={spaces} onOpenSpace={openSpace} onCreateSpace={openSpaceCreator} />
    <div className="app-main">
      <Topbar role={role} activeView={activeView} onRoleChange={changeRole} search={search} onSearch={setSearch} onSearchSubmit={() => setActiveView('search')} onAskAtlas={() => setActiveView('questions')} onNewArticle={() => openCreateForSpace('Engineering')} />
      <main className="page-content"><Suspense fallback={<div className="page-loading" role="status">Loading workspace…</div>}>
        {activeView === 'overview' && <Dashboard role={role} articles={visibleArticles} onNavigate={setActiveView} onNewArticle={() => openCreateForSpace('Engineering')} onOpenArticle={openArticle} />}
        {activeView === 'library' && <KnowledgeTable articles={visibleArticles} role={role} title="Knowledge library" description="Browse the documents, playbooks, and answers shared across your workspace." onNewArticle={() => openCreateForSpace('Engineering')} onOpenArticle={openArticle} />}
        {activeView === 'reviews' && <KnowledgeTable articles={visibleArticles} role={role} title="Review queue" description="Keep trusted knowledge moving with timely, thoughtful reviews." initialFilter="review" onNewArticle={() => openCreateForSpace('Engineering')} onOpenArticle={openArticle} />}
        {activeView === 'search' && <SearchResults articles={articles} query={search} onQueryChange={setSearch} onOpenArticle={openArticle} onSaveZeroResult={saveZeroResult} />}
        {activeView === 'article' && selectedArticle && <ArticleDetail article={selectedArticle} role={role} bookmarked={bookmarks.includes(selectedArticle.id)} onBack={() => setActiveView('library')} onBookmark={() => setBookmarks((current) => current.includes(selectedArticle.id) ? current.filter((id) => id !== selectedArticle.id) : [...current, selectedArticle.id])} onAutosave={autosaveArticle} onSaveVersion={saveArticleVersion} onStatusChange={changeArticleStatus} onComment={addArticleComment} onRestoreVersion={restoreArticleVersion} />}
        {activeView === 'spaces' && <SpacesView spaces={spaces} articles={articles} role={role} selectedSpaceName={selectedSpaceName} createOpen={isSpaceCreateOpen} onSelectSpace={setSelectedSpaceName} onCreateOpenChange={setIsSpaceCreateOpen} onOpenArticle={openArticle} onCreateArticle={openCreateForSpace} onCreateSpace={createSpaceItem} />}
        {activeView === 'questions' && <QuestionsView questions={questions} role={role} onQuestionsChange={setQuestions} />}
        {activeView === 'analytics' && <AnalyticsView articles={articles} zeroResultQueries={zeroResultQueries} />}
        {activeView === 'people' && <AdminView mode="people" users={users} events={auditEvents} settings={settings} onSettingsChange={setSettings} onInvite={inviteUser} onUpdateUser={updateUser} />}
        {activeView === 'settings' && <AdminView mode="settings" users={users} events={auditEvents} settings={settings} onSettingsChange={setSettings} onInvite={inviteUser} onUpdateUser={updateUser} />}
        {activeView === 'audit' && <AdminView mode="audit" users={users} events={auditEvents} settings={settings} onSettingsChange={setSettings} onInvite={inviteUser} onUpdateUser={updateUser} />}
      </Suspense></main>
    </div>
    <CreateArticleDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onCreate={addArticle} author="Amina Yusuf" initialSpace={createSpace} />
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
