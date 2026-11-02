import { useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, FileText, Plus, Search, Users } from 'lucide-react'
import type { Article, KnowledgeSpace, Role } from '../../types'
import { Button } from '../../components/ui/Button'
import './workspace-pages.css'

interface SpacesViewProps {
  spaces: KnowledgeSpace[]
  articles: Article[]
  role: Role
  selectedSpaceName: string | null
  createOpen: boolean
  onSelectSpace: (name: string | null) => void
  onCreateOpenChange: (open: boolean) => void
  onOpenArticle: (article: Article) => void
  onAddKnowledge: (space: string) => void
  onSaveSpace: (space: KnowledgeSpace, previousName: string | null) => Promise<string | null>
  onDeleteSpace: (name: string) => Promise<string | null>
}

export function SpacesView({ spaces, articles, role, selectedSpaceName, createOpen, onSelectSpace, onCreateOpenChange, onOpenArticle, onAddKnowledge, onSaveSpace, onDeleteSpace }: SpacesViewProps) {
  const selectedSpace = spaces.find((space) => space.name === selectedSpaceName) ?? null
  const [selectedCategory, setSelectedCategory] = useState('All categories')
  const [query, setQuery] = useState('')
  const [newSpaceName, setNewSpaceName] = useState('')
  const [newSpaceDescription, setNewSpaceDescription] = useState('')
  const [editingSpace, setEditingSpace] = useState<KnowledgeSpace | null>(null)
  const [spaceError, setSpaceError] = useState('')
  const spaceArticles = useMemo(() => articles.filter((article) => article.space === selectedSpace?.name && (selectedCategory === 'All categories' || article.category === selectedCategory) && (!query || `${article.title} ${article.summary} ${article.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()))), [articles, query, selectedCategory, selectedSpace])
  const submitSpace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newSpaceName.trim()) return
    setSpaceError('')
    const updatedSpace: KnowledgeSpace = { ...(editingSpace ?? { color: 'green', articleCount: 0, owner: 'Space owner', categories: [] }), name: newSpaceName.trim(), description: newSpaceDescription.trim() }
    const error = await onSaveSpace(updatedSpace, editingSpace?.name ?? null)
    if (error) {
      setSpaceError(error)
      return
    }
    setNewSpaceName('')
    setNewSpaceDescription('')
    setEditingSpace(null)
    onSelectSpace(updatedSpace.name)
    if (!editingSpace) onCreateOpenChange(false)
  }
  const openSpaceEditor = (space: KnowledgeSpace) => {
    setEditingSpace(space)
    setNewSpaceName(space.name)
    setNewSpaceDescription(space.description)
    setSpaceError('')
  }
  const removeSpace = async (space: KnowledgeSpace) => {
    if (!window.confirm(`Permanently delete “${space.name}” and all articles, assets, categories, and questions inside it?`)) return
    setSpaceError('')
    const error = await onDeleteSpace(space.name)
    if (error) setSpaceError(error)
  }

  if (selectedSpace) return <section className="page-section spaces-page">
    <button className="back-action" type="button" onClick={() => { onSelectSpace(null); setSelectedCategory('All categories'); setQuery('') }}><ArrowLeft size={15} />All spaces</button>
    <header className="space-detail-heading"><div className={`space-illustration space-${selectedSpace.color}`}><BookOpen size={23} /></div><div className="space-detail-copy"><div className="eyebrow">ATLAS WORKSPACE / SPACES</div><h1>{selectedSpace.name}</h1><p>{selectedSpace.description}</p><div className="space-owner-line"><Users size={14} />Owned by {selectedSpace.owner}<i />{selectedSpace.articleCount} articles</div></div>{role !== 'Viewer' && <Button onClick={() => onAddKnowledge(selectedSpace.name)}><Plus size={15} />Add knowledge</Button>}</header>
    {selectedSpace.children?.length ? <div className="nested-area-section"><div className="section-title-row"><div><h2>Nested areas</h2><p>Browse focused collections within {selectedSpace.name}.</p></div></div><div className="nested-area-list">{selectedSpace.children.map((child) => <button key={child} type="button" onClick={() => setQuery(child)}><span className="nested-area-icon"><BookOpen size={15} /></span><strong>{child}</strong><ArrowRight size={14} /></button>)}</div></div> : null}
    <div className="space-content-heading"><div><h2>Knowledge in {selectedSpace.name}</h2><p>{spaceArticles.length} matching articles</p></div><label className="table-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this space" /></label></div>
    <div className="space-category-tabs"><button className={selectedCategory === 'All categories' ? 'selected' : ''} type="button" onClick={() => setSelectedCategory('All categories')}>All categories</button>{selectedSpace.categories.map((category) => <button className={selectedCategory === category ? 'selected' : ''} key={category} type="button" onClick={() => setSelectedCategory(category)}>{category}</button>)}</div>
    <div className="space-article-list">{spaceArticles.map((article) => <button className="space-article-row" type="button" key={article.id} onClick={() => onOpenArticle(article)}><span className={`document-icon doc-${article.color}`}><FileText size={17} /></span><span className="space-article-copy"><strong>{article.title}</strong><small>{article.summary}</small><span>{article.category}<i />Updated {article.updated.toLowerCase()}<i />{article.owner}</span></span><span className={`status-pill status-${article.status.toLowerCase().replace(' ', '-')}`}><i />{article.status}</span><ArrowRight size={15} /></button>)}{spaceArticles.length === 0 && <div className="empty-state">No articles in this view yet.</div>}</div>
  </section>

  return <section className="page-section spaces-page"><div className="page-heading"><div><div className="eyebrow">A PLACE FOR EVERY KIND OF KNOWLEDGE</div><h1>Explore spaces</h1><p>Shared, organized knowledge for every team and discipline.</p></div>{role === 'Super Admin' && <Button onClick={() => onCreateOpenChange(true)}><Plus size={15} />Create space</Button>}</div><label className="results-search space-search"><Search size={17} /><input placeholder="Find a space or team" value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="spaces-grid">{spaces.filter((space) => `${space.name} ${space.description} ${space.categories.join(' ')}`.toLowerCase().includes(query.toLowerCase())).map((space) => {
    const count = articles.filter((article) => article.space === space.name).length
    return <article className="space-card" key={space.name}><div className="space-card-top"><div className={`space-illustration space-${space.color}`}><BookOpen size={20} /></div><span className="space-member-count"><Users size={13} />{space.articleCount + 4}</span></div><h2>{space.name}</h2><p>{space.description}</p><div className="space-card-categories">{space.categories.slice(0, 3).map((category) => <span key={category}>{category}</span>)}</div><div className="space-card-footer"><span><FileText size={13} />{count || space.articleCount} articles</span><span>Owner: {space.owner}</span><button type="button" onClick={() => onSelectSpace(space.name)} aria-label={`Browse ${space.name}`}><ArrowRight size={15} /></button></div></article>
  })}</div>{createOpen && <div className="admin-modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onCreateOpenChange(false) }}><form className="admin-modal" onSubmit={submitSpace}><div className="panel-heading"><div><h2>Create a space</h2><p>Give a team a home for its shared knowledge.</p></div><button type="button" className="dialog-close" onClick={() => onCreateOpenChange(false)} aria-label="Close create space dialog">×</button></div><label>Space name<input required value={newSpaceName} onChange={(event) => setNewSpaceName(event.target.value)} placeholder="e.g. Legal" /></label><label>Description<input value={newSpaceDescription} onChange={(event) => setNewSpaceDescription(event.target.value)} placeholder="What belongs here?" /></label><div className="question-form-actions"><Button variant="ghost" onClick={() => onCreateOpenChange(false)}>Cancel</Button><Button type="submit"><Plus size={14} />Create space</Button></div></form></div>}</section>
}