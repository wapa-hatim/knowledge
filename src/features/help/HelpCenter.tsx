import { useMemo, useState } from 'react'
import { ArrowRight, BookOpen, CircleHelp, FileText, Search, ShieldCheck } from 'lucide-react'
import type { View } from '../../types'
import './help.css'

const helpTopics: { title: string; description: string; view: View; icon: typeof BookOpen }[] = [
  { title: 'Find trusted knowledge', description: 'Search the library, narrow by space, and open the latest approved answer.', view: 'library', icon: Search },
  { title: 'Create and organize content', description: 'Choose a format, add it to a space, and keep it easy to discover.', view: 'models', icon: FileText },
  { title: 'Review and publish', description: 'Understand the review queue and content lifecycle.', view: 'reviews', icon: ShieldCheck },
  { title: 'Ask the workspace', description: 'Post a question, share an answer, and mark verified solutions.', view: 'questions', icon: CircleHelp },
]

export function HelpCenter({ onNavigate }: { onNavigate: (view: View) => void }) {
  const [query, setQuery] = useState('')
  const visibleTopics = useMemo(() => helpTopics.filter((topic) => `${topic.title} ${topic.description}`.toLowerCase().includes(query.toLowerCase())), [query])

  return <section className="page-section help-center-page"><div className="page-heading"><div><div className="eyebrow">ATLAS SUPPORT</div><h1>Help center</h1><p>Quick answers for finding, creating, and maintaining shared knowledge.</p></div></div>
    <label className="results-search help-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search help topics" aria-label="Search help topics" /></label>
    <div className="help-topic-grid">{visibleTopics.map((topic) => { const Icon = topic.icon; return <button className="help-topic-card" type="button" key={topic.title} onClick={() => onNavigate(topic.view)}><span className="help-topic-icon"><Icon size={18} /></span><strong>{topic.title}</strong><span>{topic.description}</span><i><ArrowRight size={15} /></i></button> })}</div>
    {visibleTopics.length === 0 && <div className="empty-state">No help topics match “{query}”. Try a different search.</div>}
    <section className="help-faq-section"><div><div className="eyebrow">COMMON QUESTIONS</div><h2>Answers to get you moving</h2></div><details><summary>How do I add knowledge to a team space?</summary><p>Open a space from the sidebar, choose <strong>Add knowledge</strong>, then select an article, file, question, metadata term, or connected source. New records are saved to this browser in the demo.</p></details><details><summary>Why does an uploaded file show “Processing”?</summary><p>This prototype stores file metadata only. File storage, text extraction, and indexing require a connected backend.</p></details><details><summary>Can I sign in with my company account?</summary><p>Not in this demo. Sign-in, SSO, password reset delivery, and access enforcement must be connected to an identity provider and API.</p></details></section>
  </section>
}

export default HelpCenter