import { useState } from 'react'
import { ArrowDownUp, ArrowRight, Download, FileText, Plus, Search } from 'lucide-react'
import * as Tabs from '@radix-ui/react-tabs'
import type { Article, Role } from '../../types'
import { Button } from '../../components/ui/Button'
import { downloadCsv } from '../../utils/exportCsv'
interface KnowledgeTableProps { articles: Article[]; role: Role; title: string; description: string; compact?: boolean; initialFilter?: 'all' | 'mine' | 'review'; onNewArticle?: () => void; onOpenArticle?: (article: Article) => void }

export function KnowledgeTable({ articles, role, title, description, compact = false, initialFilter = 'all', onNewArticle, onOpenArticle }: KnowledgeTableProps) {
  const [filter, setFilter] = useState(initialFilter)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [spaceFilter, setSpaceFilter] = useState('All spaces')
  const [sortBy, setSortBy] = useState('recent')
  const spaces = [...new Set(articles.map((article) => article.space))].sort()
  const filteredArticles = articles.filter((article) =>
    (filter !== 'mine' || article.owner === 'Amina Yusuf') &&
    (filter !== 'review' || article.status === 'Under review') &&
    (statusFilter === 'All statuses' || article.status === statusFilter) &&
    (spaceFilter === 'All spaces' || article.space === spaceFilter) &&
    (!query || `${article.title} ${article.space} ${article.owner} ${article.category}`.toLowerCase().includes(query.toLowerCase())),
  )
  const shownArticles = [...filteredArticles].sort((first, second) => {
    if (sortBy === 'title') return first.title.localeCompare(second.title)
    if (sortBy === 'space') return first.space.localeCompare(second.space) || first.title.localeCompare(second.title)
    if (sortBy === 'views') return parseViews(second.views) - parseViews(first.views)
    return articles.indexOf(first) - articles.indexOf(second)
  })

  const exportArticles = () => downloadCsv('knowledge-articles', ['ID', 'Title', 'Summary', 'Space', 'Category', 'Owner', 'Updated', 'Status', 'Views', 'Tags'], shownArticles.map((article) => [article.id, article.title, article.summary, article.space, article.category, article.owner, article.updated, article.status, article.views, article.tags.join('; ')]))

  return <section className={`knowledge-section${compact ? ' compact-knowledge' : ''}`}>
    {!compact && <div className="page-heading library-heading"><div><div className="eyebrow">YOUR SHARED MEMORY</div><h1>{title}</h1><p>{description}</p></div>{role !== 'Viewer' && <Button onClick={onNewArticle}><Plus size={16} />Add knowledge</Button>}</div>}
    <div className="library-toolbar"><Tabs.Root value={filter} onValueChange={(value) => setFilter(value as typeof filter)}><Tabs.List aria-label="Filter articles" className="library-tabs"><Tabs.Trigger value="all">All articles <span>{articles.length}</span></Tabs.Trigger><Tabs.Trigger value="mine">My contributions</Tabs.Trigger><Tabs.Trigger value="review">Needs review</Tabs.Trigger></Tabs.List></Tabs.Root><div className="table-tools"><label className="table-search"><Search size={15} /><input placeholder="Filter articles" aria-label="Filter articles" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label className="table-filter-wrap"><span className="sr-only">Filter by status</span><select className="table-filter-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option><option>Published</option><option>Under review</option><option>Draft</option><option>Archived</option></select></label><label className="table-filter-wrap"><span className="sr-only">Filter by space</span><select className="table-filter-select" value={spaceFilter} onChange={(event) => setSpaceFilter(event.target.value)}><option>All spaces</option>{spaces.map((space) => <option key={space}>{space}</option>)}</select></label><label className="table-filter-wrap table-sort-wrap"><span className="sr-only">Sort articles</span><select className="table-filter-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="recent">Recent</option><option value="title">Title</option><option value="space">Space</option><option value="views">Most viewed</option></select></label>{!compact && <button className="table-tool-button" type="button" aria-label="Export filtered articles as CSV" title="Export CSV" onClick={exportArticles}><Download size={15} /></button>}</div></div>
    <div className="table-scroll"><table className="knowledge-table"><thead><tr><th>ARTICLE <ArrowDownUp size={12} /></th><th>SPACE</th><th>OWNER</th><th>LAST UPDATED</th><th>STATUS</th><th>VIEWS</th><th><span className="sr-only">Open article</span></th></tr></thead><tbody>{shownArticles.map((article) => <tr key={article.id}><td><button className="table-article table-article-button" type="button" onClick={() => onOpenArticle?.(article)}><div className={`document-icon doc-${article.color}`}><FileText size={16} /></div><div><strong>{article.title}</strong><span>{article.category}<i />{article.id}</span></div></button></td><td><span className="space-cell"><i className={`space-dot dot-${article.color === 'peach' ? 'orange' : article.color === 'blue' ? 'blue' : article.color === 'lilac' ? 'pink' : 'green'}`} />{article.space}</span></td><td><span className="owner-cell"><i className={`owner-avatar owner-${article.color}`}>{article.initials}</i>{article.owner}</span></td><td className="updated-cell">{article.updated}</td><td><span className={`status-pill status-${article.status.toLowerCase().replace(' ', '-')}`}><i />{article.status}</span></td><td className="views-cell">{article.views}</td><td><button className="row-arrow table-row-arrow" type="button" aria-label={`Open ${article.title}`} onClick={() => onOpenArticle?.(article)}><ArrowRight size={14} /></button></td></tr>)}</tbody></table></div>
    {shownArticles.length === 0 && <div className="empty-state table-empty">No articles match this view yet.</div>}<div className="table-footer"><span>Showing <strong>{shownArticles.length}</strong> of <strong>{articles.length}</strong> articles</span><div><button type="button" disabled>Previous</button><button type="button">Next <ArrowRight size={13} /></button></div></div>
  </section>
}

function parseViews(views: string) {
  const normalized = views.toLowerCase().replace(',', '')
  const value = Number.parseFloat(normalized)
  if (Number.isNaN(value)) return 0
  return normalized.endsWith('k') ? value * 1000 : value
}