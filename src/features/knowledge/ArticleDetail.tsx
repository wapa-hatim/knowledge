import { useState, type FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { diffLines } from 'diff'
import { ArrowLeft, Bookmark, Check, Clock3, GitCompare, Pencil, RotateCcw, Send, ShieldCheck, Trash2, X } from 'lucide-react'
import type { Article, ArticleComment, ArticleStatus, ArticleVersion, Role } from '../../types'
import { Button } from '../../components/ui/Button'
import { ArticleEditor } from './ArticleEditor'
import './knowledge.css'

interface ArticleDetailProps {
  article: Article
  role: Role
  currentUserName: string
  bookmarked: boolean
  taxonomyTerms: string[]
  onBack: () => void
  onBookmark: () => void | Promise<void>
  onTagsChange: (tags: string[]) => Promise<boolean>
  onAutosave: (body: string) => Promise<boolean>
  onSaveVersion: (body: string) => Promise<boolean>
  onStatusChange: (status: ArticleStatus) => Promise<boolean>
  onComment: (comment: ArticleComment) => Promise<boolean>
  onFeedback: (helpful: boolean, feedback: string) => Promise<boolean>
  onRestoreVersion: (version: ArticleVersion) => Promise<boolean>
  onDelete: () => Promise<void>
}

export function ArticleDetail({ article, role, currentUserName, bookmarked, taxonomyTerms, onBack, onBookmark, onTagsChange, onAutosave, onSaveVersion, onStatusChange, onComment, onFeedback, onRestoreVersion, onDelete }: ArticleDetailProps) {
  const [editing, setEditing] = useState(false)
  const [comment, setComment] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [feedbackNotice, setFeedbackNotice] = useState('')
  const [newTag, setNewTag] = useState('')
  const [selectedTaxonomyTerm, setSelectedTaxonomyTerm] = useState('')
  const [tagNotice, setTagNotice] = useState('')
  const [isSavingTags, setIsSavingTags] = useState(false)
  const [compareVersion, setCompareVersion] = useState(article.versions?.[0]?.id ?? '')
  const canEdit = role !== 'Viewer'
  const canReview = ['Super Admin', 'Space Admin', 'Reviewer'].includes(role)
  const body = article.body || `# ${article.title}\n\n${article.summary}`
  const versions = article.versions ?? []
  const comparison = versions.find((version) => version.id === compareVersion)

  const submitComment = async () => {
    if (!comment.trim()) return
    const saved = await onComment({ id: crypto.randomUUID(), author: currentUserName, body: comment.trim(), createdAt: 'Just now' })
    if (saved) setComment('')
  }
  const submitFeedback = async (helpful: boolean) => {
    setFeedbackNotice('')
    const saved = await onFeedback(helpful, '')
    setFeedbackNotice(saved ? 'Feedback saved.' : 'Feedback could not be saved.')
  }
  const saveTags = async (tags: string[]) => {
    if (isSavingTags) return false
    setTagNotice('')
    setIsSavingTags(true)
    try {
      const saved = await onTagsChange(tags)
      if (!saved) setTagNotice('Tags could not be saved. Check your space access.')
      return saved
    } finally {
      setIsSavingTags(false)
    }
  }
  const addTag = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const tag = newTag.trim().replace(/^#/, '').toLowerCase()
    if (!tag || article.tags.includes(tag)) return
    if (await saveTags([...article.tags, tag])) setNewTag('')
  }
  const addTaxonomyTag = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedTaxonomyTerm || article.tags.includes(selectedTaxonomyTerm)) return
    if (await saveTags([...article.tags, selectedTaxonomyTerm])) setSelectedTaxonomyTerm('')
  }
  const submitReview = async () => {
    const saved = await onStatusChange('Under review')
    if (saved) setEditing(false)
  }

  if (editing) return <section className="page-section"><div className="detail-topline"><button className="back-action" onClick={() => setEditing(false)} type="button"><ArrowLeft size={15} />Back to article</button><span className="article-id">{article.id}</span></div><div className="editor-title-block"><span className="eyebrow">EDITING IN {article.space.toUpperCase()}</span><h1>{article.title}</h1><p>{article.summary}</p></div><ArticleEditor articleId={article.id} initialBody={body} onAutosave={onAutosave} onSaveVersion={onSaveVersion} onCancel={() => setEditing(false)} onSubmitReview={submitReview} /></section>

  return <section className="page-section article-page">
    <div className="detail-topline"><button className="back-action" onClick={onBack} type="button"><ArrowLeft size={15} />Knowledge library</button><span className="article-id">{article.id}</span></div>
    <div className="article-layout"><article className="article-main"><div className="article-heading"><div className="article-crumb"><span>{article.space}</span><span>/</span><span>{article.category}</span></div><div className="article-title-row"><h1>{article.title}</h1><Button unstyled className={`bookmark-action${bookmarked ? ' bookmarked' : ''}`} onClick={onBookmark} type="button" aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark article'} loadingText=""><Bookmark size={18} fill={bookmarked ? 'currentColor' : 'none'} /></Button></div><p className="article-summary">{article.summary}</p><div className="article-byline"><span className={`owner-avatar owner-${article.color}`}>{article.initials}</span><strong>{article.owner}</strong><span>Updated {article.updated.toLowerCase()}</span><span className={`status-pill status-${article.status.toLowerCase().replace(' ', '-')}`}><i />{article.status}</span></div></div>
      <div className="article-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown></div>
      <div className="article-feedback"><div><strong>Was this article helpful?</strong><span>{feedbackNotice || 'Your feedback helps keep knowledge useful.'}</span></div><Button unstyled type="button" onClick={() => submitFeedback(true)} loadingText="Saving…"><Check size={14} />Yes, helpful</Button><Button unstyled type="button" onClick={() => submitFeedback(false)} loadingText="Saving…">Needs work</Button></div>
      <section className="comments-section"><div className="section-title-row"><div><h2>Discussion <span>{article.comments?.length ?? 0}</span></h2><p>Share context or ask the owner a question.</p></div></div><div className="comment-compose"><div className="profile-avatar">{currentUserName.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'U'}</div><input value={comment} onChange={(event) => setComment(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void submitComment() }} placeholder="Write a comment or @mention a teammate…" aria-label="Write a comment" /><Button unstyled className="comment-post-button" type="button" onClick={submitComment} aria-label="Post comment" loadingText=""><Send size={15} /></Button></div>{article.comments?.map((item) => <article className="comment-row" key={item.id}><div className="profile-avatar">{item.author.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><div><p><strong>{item.author}</strong><span>{item.createdAt}</span></p><div>{item.body}</div></div></article>)}</section>
    </article>
    <aside className="article-sidebar"><div className="article-actions-panel"><div className="eyebrow">ARTICLE ACTIONS</div>{canEdit && <button type="button" onClick={() => setEditing(true)}><Pencil size={15} />Edit article</button>}{article.status === 'Draft' && canEdit && <Button unstyled type="button" onClick={() => onStatusChange('Under review')} loadingText="Requesting review…"><ShieldCheck size={15} />Request review</Button>}{article.status === 'Under review' && canReview && <Button unstyled type="button" className="publish-action" onClick={() => onStatusChange('Published')} loadingText="Publishing…"><Check size={15} />Approve & publish</Button>}{canEdit && <button type="button" onClick={() => setShowHistory((value) => !value)}><GitCompare size={15} />Version history <span>{versions.length}</span></button>}{canReview && article.status === 'Published' && <Button unstyled type="button" onClick={() => onStatusChange('Archived')} loadingText="Archiving…"><Clock3 size={15} />Archive article</Button>}{role === 'Super Admin' && <Button unstyled type="button" className="article-delete-action" onClick={async () => { if (window.confirm(`Permanently delete “${article.title}”?`)) await onDelete() }} loadingText="Deleting…"><Trash2 size={15} />Delete article</Button>}</div>
      <div className="article-meta-panel"><h2>About this article</h2><dl><div><dt>Owner</dt><dd>{article.owner}</dd></div><div><dt>Space</dt><dd>{article.space}</dd></div><div><dt>Category</dt><dd>{article.category}</dd></div><div><dt>Review due</dt><dd>{article.reviewDue || 'Not scheduled'}</dd></div><div><dt>Views</dt><dd>{article.views}</dd></div></dl><div className="article-tags">{article.tags.map((tag) => <span className="article-tag" key={tag}><span>#{tag}</span>{canEdit && <Button unstyled className="article-tag-remove" type="button" title={`Remove #${tag}`} aria-label={`Remove #${tag}`} onClick={() => saveTags(article.tags.filter((item) => item !== tag))} loadingText=""><X size={11} /></Button>}</span>)}</div>{canEdit && taxonomyTerms.some((term) => !article.tags.includes(term)) && <form className="article-tag-form" onSubmit={(event) => void addTaxonomyTag(event)}><label className="sr-only" htmlFor="article-taxonomy-tag">Choose a shared taxonomy tag</label><select id="article-taxonomy-tag" value={selectedTaxonomyTerm} onChange={(event) => setSelectedTaxonomyTerm(event.target.value)} disabled={isSavingTags}><option value="">Choose a shared tag</option>{taxonomyTerms.filter((term) => !article.tags.includes(term)).map((term) => <option key={term} value={term}>#{term}</option>)}</select><Button unstyled type="submit" className="article-tag-submit" isLoading={isSavingTags} loadingText="Saving tag…" disabled={!selectedTaxonomyTerm}><Check size={13} /></Button></form>}{canEdit && <form className="article-tag-form" onSubmit={(event) => void addTag(event)}><label className="sr-only" htmlFor="article-custom-tag">Add a custom article tag</label><input id="article-custom-tag" value={newTag} onChange={(event) => setNewTag(event.target.value)} aria-label="Add article tag" placeholder="Add custom tag" disabled={isSavingTags} /><Button unstyled type="submit" className="article-tag-submit" isLoading={isSavingTags} loadingText="Saving tag…" disabled={!newTag.trim()}><Check size={13} /></Button></form>}{tagNotice && <p className="article-tag-notice" role="alert">{tagNotice}</p>}</div>
      {showHistory && <div className="article-history-panel"><div className="panel-heading"><h2>Version history</h2><span>{versions.length} saved</span></div>{versions.length === 0 ? <p className="empty-state">Save a version while editing to start a history.</p> : <>{versions.map((version) => <button className={`version-row${compareVersion === version.id ? ' selected' : ''}`} key={version.id} onClick={() => setCompareVersion(version.id)} type="button"><span><strong>{version.author}</strong><small>{version.savedAt}</small></span><span>{version.status}</span></button>)}{comparison && <div className="version-diff"><div className="diff-heading">Current vs {comparison.savedAt}</div>{diffLines(comparison.body, body).slice(0, 18).map((part, index) => <div className={`diff-line${part.added ? ' added' : part.removed ? ' removed' : ''}`} key={`${index}-${part.value}`}>{part.added ? '+ ' : part.removed ? '− ' : '  '}{part.value}</div>)}<Button unstyled className="restore-action" type="button" onClick={() => onRestoreVersion(comparison)} loadingText="Restoring version…"><RotateCcw size={13} />Restore this version</Button></div>}</>}</div>}
      <div className="review-note"><Clock3 size={15} /><span><strong>Keep it current</strong><small>Review every 6 months so this stays useful.</small></span></div>
    </aside></div>
  </section>
}