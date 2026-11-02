import { useMemo, useState } from 'react'
import { ArrowDownWideNarrow, ArrowRight, FileText, Search, SlidersHorizontal } from 'lucide-react'
import type { Article } from '../../types'
import { parseViewCount } from '../../utils/articleMetrics'
import './knowledge.css'

interface SearchResultsProps { articles: Article[]; query: string; onQueryChange: (value: string) => void; onOpenArticle: (article: Article) => void; onSaveZeroResult: (query: string) => void }

export function SearchResults({ articles, query, onQueryChange, onOpenArticle, onSaveZeroResult }: SearchResultsProps) {
  const [space, setSpace] = useState('All spaces')
  const [category, setCategory] = useState('All categories')
  const [author, setAuthor] = useState('All authors')
  const [sort, setSort] = useState('relevance')
  const options = useMemo(() => ({
    spaces: [...new Set(articles.map((article) => article.space))],
    categories: [...new Set(articles.map((article) => article.category))],
    authors: [...new Set(articles.map((article) => article.owner))],
  }), [articles])
  const results = useMemo(() => {
    const normalized = query.toLowerCase().trim()
    const matches = articles.filter((article) => {
      const text = [article.title, article.summary, article.body, article.space, article.category, article.owner, ...article.tags].join(' ').toLowerCase()
      return (!normalized || text.includes(normalized)) && (space === 'All spaces' || article.space === space) && (category === 'All categories' || article.category === category) && (author === 'All authors' || article.owner === author)
    })
    return matches.sort((left, right) => sort === 'recent' ? articles.indexOf(left) - articles.indexOf(right) : sort === 'popular' ? parseViewCount(right.views) - parseViewCount(left.views) : 0)
  }, [articles, author, category, query, sort, space])

  return <section className="page-section search-page"><div className="page-heading"><div><div className="eyebrow">SEARCH YOUR WORKSPACE</div><h1>Find the answer, not another rabbit hole.</h1><p>Search titles, content, tags, owners, and spaces.</p></div></div>
    <label className="results-search"><Search size={18} /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Try a topic, question, or keyword" autoFocus /><kbd>Enter</kbd></label>
    <div className="search-layout"><aside className="search-facets"><div className="facet-heading"><SlidersHorizontal size={15} /><strong>Refine results</strong></div><label>Space<select value={space} onChange={(event) => setSpace(event.target.value)}><option>All spaces</option>{options.spaces.map((item) => <option key={item}>{item}</option>)}</select></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>All categories</option>{options.categories.map((item) => <option key={item}>{item}</option>)}</select></label><label>Author<select value={author} onChange={(event) => setAuthor(event.target.value)}><option>All authors</option>{options.authors.map((item) => <option key={item}>{item}</option>)}</select></label><div className="facet-tip"><strong>Search tip</strong><span>Try a team acronym, related phrase, or article tag.</span></div></aside>
      <div className="search-results"><div className="results-toolbar"><span><strong>{results.length}</strong> results {query && <>for <b>“{query}”</b></>}</span><label><ArrowDownWideNarrow size={14} /><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="relevance">Best match</option><option value="recent">Recently updated</option><option value="popular">Most viewed</option></select></label></div>
        {results.length ? results.map((article) => <button className="search-result-row" key={article.id} type="button" onClick={() => onOpenArticle(article)}><div className={`document-icon doc-${article.color}`}><FileText size={17} /></div><div className="search-result-copy"><strong>{article.title}</strong><p>{article.summary}</p><span>{article.space} <i /> {article.category} <i /> {article.owner} <i /> Updated {article.updated.toLowerCase()}</span><div className="search-result-tags">{article.tags.map((tag) => <small key={tag}>#{tag}</small>)}</div></div><ArrowRight size={16} /></button>) : <div className="search-empty"><div className="empty-search-icon"><Search size={20} /></div><h2>No articles found</h2><p>Try a broader keyword, or note this search as a documentation gap.</p><button className="ui-button ui-button-outline ui-button-default" type="button" onClick={() => { if (query.trim()) onSaveZeroResult(query) }}>Record this search gap</button></div>}
      </div></div>
  </section>
}