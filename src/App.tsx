import { useMemo, useState } from 'react'
import { Sidebar } from './components/shell/Sidebar'
import { Topbar } from './components/shell/Topbar'
import { Dashboard } from './features/dashboard/Dashboard'
import { CreateArticleDialog } from './features/knowledge/CreateArticleDialog'
import { KnowledgeTable } from './features/knowledge/KnowledgeTable'
import { initialArticles } from './data/knowledge'
import type { Article, Role, View } from './types'

const roleViews: Record<Role, View[]> = {
  'Super Admin': ['overview', 'library', 'reviews', 'questions', 'analytics'],
  'Space Admin': ['overview', 'library', 'reviews', 'questions', 'analytics'],
  Author: ['overview', 'library', 'questions'],
  Reviewer: ['overview', 'library', 'reviews', 'questions'],
  Viewer: ['overview', 'library', 'questions'],
}

function App() {
  const [role, setRole] = useState<Role>('Super Admin')
  const [activeView, setActiveView] = useState<View>('overview')
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [articles, setArticles] = useState(initialArticles)
  const visibleArticles = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return articles
    return articles.filter((article) => [article.title, article.space, article.category, article.owner, ...article.tags].join(' ').toLowerCase().includes(query))
  }, [articles, search])
  const addArticle = (article: Article) => {
    setArticles((current) => [article, ...current])
    setIsCreateOpen(false)
    setActiveView('library')
  }
  const changeRole = (nextRole: Role) => {
    setRole(nextRole)
    if (!roleViews[nextRole].includes(activeView)) setActiveView('overview')
  }

  return <div className="app-shell">
    <Sidebar activeView={activeView} onNavigate={setActiveView} role={role} />
    <div className="app-main">
      <Topbar role={role} activeView={activeView} onRoleChange={changeRole} search={search} onSearch={setSearch} onNewArticle={() => setIsCreateOpen(true)} />
      <main className="page-content">
        {activeView === 'overview' && <Dashboard role={role} articles={visibleArticles} onNavigate={setActiveView} onNewArticle={() => setIsCreateOpen(true)} />}
        {activeView === 'library' && <KnowledgeTable articles={visibleArticles} role={role} title="Knowledge library" description="Browse the documents, playbooks, and answers shared across your workspace." onNewArticle={() => setIsCreateOpen(true)} />}
        {activeView === 'reviews' && <KnowledgeTable articles={visibleArticles} role={role} title="Review queue" description="Keep trusted knowledge moving with timely, thoughtful reviews." initialFilter="review" onNewArticle={() => setIsCreateOpen(true)} />}
        {activeView === 'questions' && <QuestionsView />}
        {activeView === 'analytics' && <AnalyticsView articles={articles} />}
      </main>
    </div>
    <CreateArticleDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} onCreate={addArticle} author="Amina Yusuf" />
  </div>
}

function QuestionsView() {
  const questions = [
    { title: 'What is the process for requesting production access?', answers: 4, votes: 18, space: 'Engineering', status: 'Answered' },
    { title: 'How do I submit an expense from a previous month?', answers: 2, votes: 11, space: 'People & Finance', status: 'Verified' },
    { title: 'Which customer environments support SSO?', answers: 0, votes: 7, space: 'Customer Success', status: 'Open' },
  ]
  return <section className="page-section"><div className="page-heading"><div><div className="eyebrow">KNOWLEDGE EXCHANGE</div><h1>Questions & answers</h1><p>Find a verified answer or help someone else move forward.</p></div><button className="ui-button ui-button-primary ui-button-default" type="button">Ask a question</button></div><div className="question-list">{questions.map((question) => <article className="question-row" key={question.title}><div className="question-votes"><strong>{question.votes}</strong><span>votes</span></div><div className="question-copy"><h2>{question.title}</h2><span>{question.space} <i /> {question.answers} answers</span></div><span className={`status-pill status-${question.status.toLowerCase()}`}>{question.status}</span></article>)}</div></section>
}

function AnalyticsView({ articles }: { articles: Article[] }) {
  const bars = [38, 58, 46, 74, 61, 88, 70, 96, 65, 81, 57, 91]
  return <section className="page-section"><div className="page-heading"><div><div className="eyebrow">WORKSPACE INSIGHTS</div><h1>Knowledge analytics</h1><p>See what your team is learning, sharing, and still looking for.</p></div><button className="date-filter" type="button">Last 30 days <span>⌄</span></button></div>
    <div className="analytics-summary"><div className="analytics-card"><span>Article views</span><strong>18,492</strong><small className="trend-up">↗ 12.8% from last month</small></div><div className="analytics-card"><span>Search success</span><strong>92.4%</strong><small className="trend-up">↗ 3.2% from last month</small></div><div className="analytics-card"><span>Unanswered searches</span><strong>137</strong><small className="trend-down">↘ 8.1% from last month</small></div></div>
    <div className="analytics-grid"><article className="panel traffic-panel"><div className="panel-heading"><div><h2>Knowledge activity</h2><p>Views and contributions over time</p></div><span className="chart-legend"><i /> Views</span></div><div className="bar-chart" aria-label="Article views over the last twelve weeks">{bars.map((height, index) => <div className="chart-column" key={index}><span style={{ height: `${height}%` }} /><small>W{index + 1}</small></div>)}</div></article>
      <article className="panel search-gaps-panel"><div className="panel-heading"><div><h2>Search gaps</h2><p>Queries without a useful result</p></div><span className="count-label">137 total</span></div>{['vpn access for contractors', 'travel policy exception', 'rotate staging credentials', 'parental leave eligibility'].map((query, index) => <div className="gap-row" key={query}><span>{query}</span><strong>{[24, 18, 12, 9][index]}</strong></div>)}</article></div>
    <div className="section-title-row"><div><h2>Most viewed articles</h2><p>Content your team returns to most</p></div><span className="muted-count">{articles.length} tracked</span></div><KnowledgeTable articles={articles.slice(0, 4)} role="Super Admin" title="" description="" compact />
  </section>
}

export default App
