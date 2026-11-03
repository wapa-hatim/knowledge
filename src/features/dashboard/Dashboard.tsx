import { ArrowRight, BookOpen, Clock3, FileText, Plus, Sparkles, Users } from 'lucide-react'
import * as Tabs from '@radix-ui/react-tabs'
import type { Article, AuditEvent, Role, View } from '../../types'
import { Button } from '../../components/ui/Button'
import { parseViewCount } from '../../utils/articleMetrics'
import { KnowledgeTable } from '../knowledge/KnowledgeTable'

interface DashboardProps { role: Role; userName: string; articles: Article[]; events: AuditEvent[]; onNavigate: (view: View) => void; onNewArticle: () => void; onOpenArticle: (article: Article) => void }
const dashboardCopy: Record<Role, { eyebrow: string; description: string }> = {
  'Super Admin': { eyebrow: 'YOUR WORKSPACE', description: 'Here’s what’s happening across your knowledge workspace.' },
  'Space Admin': { eyebrow: 'ENGINEERING SPACE', description: 'A clear view of your space, its people, and the knowledge they rely on.' },
  Author: { eyebrow: 'YOUR CONTRIBUTIONS', description: 'Your ideas are becoming the answers your team needs.' },
  Reviewer: { eyebrow: 'YOUR REVIEW DESK', description: 'A few thoughtful reviews can keep your team’s knowledge trustworthy.' },
  Viewer: { eyebrow: 'YOUR KNOWLEDGE HOME', description: 'Pick up where you left off or find something useful for today.' },
}

function getGreeting(date: Date) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function getTodayLabel(date: Date) {
  return new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(date).toUpperCase()
}

export function Dashboard({ role, userName, articles, events, onNavigate, onNewArticle, onOpenArticle }: DashboardProps) {
  const currentDate = new Date()
  const focusArticles = role === 'Reviewer' ? articles.filter((article) => article.status === 'Under review') : role === 'Author' ? articles.filter((article) => article.owner === userName || article.status === 'Draft') : articles
  const publishedCount = articles.filter((article) => article.status === 'Published').length
  const reviewCount = articles.filter((article) => article.status === 'Under review').length
  const contributorCount = new Set(articles.map((article) => article.owner).filter(Boolean)).size
  const spaceCount = new Set(articles.map((article) => article.space).filter(Boolean)).size
  const metrics = [
    { label: 'Articles', value: articles.length, detail: 'Loaded from Supabase', icon: FileText, tone: 'tone-mint' },
    { label: 'Published', value: publishedCount, detail: `${articles.length - publishedCount} other statuses`, icon: BookOpen, tone: 'tone-blue' },
    { label: 'Awaiting review', value: reviewCount, detail: 'Current review queue', icon: Clock3, tone: 'tone-peach' },
    { label: 'Article owners', value: contributorCount, detail: `${spaceCount} spaces represented`, icon: Users, tone: 'tone-lilac' },
  ]
  return <section className="page-section dashboard-page"><div className="page-heading dashboard-heading"><div><div className="eyebrow"><span className="eyebrow-dot" />{role === 'Super Admin' ? getTodayLabel(currentDate) : dashboardCopy[role].eyebrow}</div><h1>{getGreeting(currentDate)}, {userName || 'there'}<span className="greeting-period">.</span></h1><p>{dashboardCopy[role].description}</p></div><div className="heading-actions"><Button variant="outline" onClick={() => onNavigate('library')}><BookOpen size={15} />Browse library</Button>{role !== 'Viewer' && <Button onClick={onNewArticle}><Plus size={16} />Add knowledge</Button>}</div></div>
    {role === 'Viewer' && <button className="answer-banner" type="button" onClick={() => onNavigate('questions')}><div className="answer-icon"><Sparkles size={17} /></div><div><strong>Looking for something specific?</strong><span>Ask Atlas to find a trusted answer across your workspace.</span></div><ArrowRight size={17} /> </button>}
    <div className="metric-grid">{metrics.map((metric, index) => { const Icon = metric.icon; return <article className="metric-card" key={metric.label} style={{ animationDelay: `${index * 55}ms` }}><div className="metric-top"><span>{metric.label}</span><span className={`metric-icon ${metric.tone}`}><Icon size={17} /></span></div><div className="metric-value">{metric.value}</div><div className="metric-delta">{metric.detail}</div></article> })}</div>
    <div className="dashboard-main-grid"><section className="panel recent-panel"><div className="panel-heading recent-heading"><div><div className="eyebrow">{role === 'Reviewer' ? 'NEEDS YOUR EYES' : 'PICK UP WHERE YOU LEFT OFF'}</div><h2>{role === 'Reviewer' ? 'Your review queue' : role === 'Viewer' ? 'Recently updated' : 'Recent knowledge'}</h2></div><button className="text-action" type="button" onClick={() => onNavigate(role === 'Reviewer' ? 'reviews' : 'library')}>View all <ArrowRight size={14} /></button></div><Tabs.Root defaultValue="all" className="dashboard-tabs"><Tabs.List aria-label="Filter recent knowledge"><Tabs.Trigger value="all">For you</Tabs.Trigger><Tabs.Trigger value="updated">Recently updated</Tabs.Trigger><Tabs.Trigger value="popular">Popular</Tabs.Trigger></Tabs.List><Tabs.Content value="all"><ArticleFocusList articles={focusArticles.slice(0, 4)} onOpenArticle={onOpenArticle} /></Tabs.Content><Tabs.Content value="updated"><ArticleFocusList articles={[...articles].slice(0, 4)} onOpenArticle={onOpenArticle} /></Tabs.Content><Tabs.Content value="popular"><ArticleFocusList articles={[...articles].sort((a, b) => parseViewCount(b.views) - parseViewCount(a.views)).slice(0, 4)} onOpenArticle={onOpenArticle} /></Tabs.Content></Tabs.Root></section>
      <aside className="panel activity-panel"><div className="panel-heading"><div><div className="eyebrow">WORKSPACE ACTIVITY</div><h2>Recent changes</h2></div><button className="more-button" type="button" aria-label="Open analytics" onClick={() => onNavigate('analytics')}>···</button></div>{events.length ? events.slice(0, 3).map((event) => <div className="activity-item" key={event.id}><span className="activity-person person-mint">{event.actor.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><p><strong>{event.actor}</strong> {event.action.toLowerCase()} <b>{event.target}</b><small>{event.date}</small></p></div>) : <div className="empty-state">Activity will appear here as changes are recorded.</div>}</aside></div>
    <div className="section-title-row library-section-heading"><div><div className="eyebrow">FIND YOUR NEXT ANSWER</div><h2>Popular across your workspace</h2></div><button className="text-action" type="button" onClick={() => onNavigate('library')}>Explore library <ArrowRight size={14} /></button></div><KnowledgeTable articles={articles.slice(0, 4)} role={role} currentUserName={userName} title="" description="" compact onNewArticle={onNewArticle} onOpenArticle={onOpenArticle} />
  </section>
}

function ArticleFocusList({ articles, onOpenArticle }: { articles: Article[]; onOpenArticle: (article: Article) => void }) {
  if (!articles.length) return <div className="empty-state">You’re all caught up. New knowledge will show up here.</div>
  return <div className="focus-list">{articles.map((article) => <article className="focus-row" key={article.id}><div className={`document-icon doc-${article.color}`}><FileText size={17} /></div><div className="focus-copy"><strong>{article.title}</strong><span>{article.space} <i /> {article.category}</span></div><span className={`status-pill status-${article.status.toLowerCase().replace(' ', '-')}`}>{article.status}</span><button className="row-arrow" type="button" aria-label={`Open ${article.title}`} onClick={() => onOpenArticle(article)}><ArrowRight size={15} /></button></article>)}</div>
}