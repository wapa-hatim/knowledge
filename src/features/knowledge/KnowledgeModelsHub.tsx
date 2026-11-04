import { ArrowRight, BookOpenText, Braces, CheckCircle2, CircleHelp, FileArchive, FileUp, Layers3, LoaderCircle, Network, Plus, SearchCheck, ShieldCheck, Tags, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { KnowledgeAsset, KnowledgeIntegration, KnowledgeModel, View } from '../../types'
import { Button } from '../../components/ui/Button'
import './knowledge-hub.css'

interface KnowledgeModelsHubProps {
  models: KnowledgeModel[]
  loading: boolean
  assets: KnowledgeAsset[]
  integrations: KnowledgeIntegration[]
  taxonomyTerms: string[]
  canManageTaxonomy: boolean
  onNavigate: (view: View) => void
  onCreateArticle: () => void
  onCreateAsset: () => void
  onCreateSource: () => void
  onAddTaxonomyTerm: (term: string) => Promise<string | null>
  onRemoveTaxonomyTerm: (term: string) => Promise<string | null>
}

const knowledgeTypes = [
  { title: 'Structured content', detail: 'Articles, SOPs, FAQs, specs', icon: BookOpenText, tone: 'tone-mint', action: 'Create document' },
  { title: 'Unstructured assets', detail: 'PDFs, video, audio, diagrams', icon: FileArchive, tone: 'tone-blue', action: 'Upload asset' },
  { title: 'Explicit metadata', detail: 'Taxonomies, entities, tags', icon: Tags, tone: 'tone-peach', action: 'Manage taxonomy' },
  { title: 'Tacit knowledge', detail: 'Questions and verified answers', icon: CircleHelp, tone: 'tone-lilac', action: 'Open Q&A' },
  { title: 'Dynamic data', detail: 'API specs and release feeds', icon: Braces, tone: 'tone-blue', action: 'Connect source' },
]

export function KnowledgeModelsHub({ models, loading, assets, integrations, taxonomyTerms, canManageTaxonomy, onNavigate, onCreateArticle, onCreateAsset, onCreateSource, onAddTaxonomyTerm, onRemoveTaxonomyTerm }: KnowledgeModelsHubProps) {
  const [newTerm, setNewTerm] = useState('')
  const [taxonomyError, setTaxonomyError] = useState('')
  const [isAddingTerm, setIsAddingTerm] = useState(false)
  const [pendingTerm, setPendingTerm] = useState<string | null>(null)
  const modelHighlights = [
    { label: 'Managed models', value: models.filter((model) => model.status === 'Managed').length, delta: 'From Supabase', icon: Layers3, tone: 'tone-mint' },
    { label: 'Templates in use', value: models.length, delta: 'Stored workspace models', icon: BookOpenText, tone: 'tone-blue' },
    { label: 'Assets indexed', value: assets.filter((asset) => asset.status === 'Indexed').length, delta: `${assets.length} stored assets`, icon: ShieldCheck, tone: 'tone-peach' },
  ]
  const submitTerm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const term = newTerm.trim().replace(/^#/, '').toLowerCase()
    if (!term || !canManageTaxonomy || isAddingTerm) return
    setTaxonomyError('')
    setIsAddingTerm(true)
    try {
      const error = await onAddTaxonomyTerm(term)
      if (error) {
        setTaxonomyError(error)
        return
      }
      setNewTerm('')
    } finally {
      setIsAddingTerm(false)
    }
  }
  const removeTerm = async (term: string) => {
    if (!window.confirm(`Remove #${term} from the shared taxonomy? Any article links to this term will also be removed.`)) return
    setTaxonomyError('')
    setPendingTerm(term)
    try {
      const error = await onRemoveTaxonomyTerm(term)
      if (error) setTaxonomyError(error)
    } finally {
      setPendingTerm(null)
    }
  }

  return <section className="page-section">
    <div className="page-heading">
      <div>
        <div className="eyebrow"><span className="eyebrow-dot" />KNOWLEDGE SYSTEM</div>
        <h1>Formats & models hub</h1>
        <p>Standardize how knowledge is created, reviewed, and reused across the workspace.</p>
      </div>
      <div className="heading-actions"><Button variant="outline" onClick={() => onNavigate('library')}>Open library</Button><Button onClick={onCreateSource}><Network size={15} />Connect source</Button></div>
    </div>

    <div className="knowledge-type-grid">
      {knowledgeTypes.map(({ title, detail, icon: Icon, tone, action }) => <article className="knowledge-type-card" key={title}>
        <span className={`metric-icon ${tone}`}><Icon size={17} /></span><strong>{title}</strong><span>{detail}</span>
        <button type="button" onClick={title === 'Structured content' ? onCreateArticle : title === 'Unstructured assets' ? onCreateAsset : title === 'Explicit metadata' ? () => document.getElementById('taxonomy-panel')?.scrollIntoView({ behavior: 'smooth' }) : title === 'Tacit knowledge' ? () => onNavigate('questions') : onCreateSource}>{action}<ArrowRight size={13} /></button>
      </article>)}
    </div>

    <div className="metric-grid analytics-summary">
      {modelHighlights.map(({ label, value, delta, icon: Icon, tone }) => (
        <article className="metric-card" key={label}>
          <div className="metric-top">
            <span>{label}</span>
            <span className={`metric-icon ${tone}`}><Icon size={17} /></span>
          </div>
          <div className="metric-value">{value}</div>
          <div className="metric-delta"><ArrowRight size={13} />{delta}</div>
        </article>
      ))}
    </div>

    <div className="knowledge-hub-grid">
      <section className="panel knowledge-hub-panel"><div className="hub-panel-heading"><div><div className="eyebrow">FILES & MEDIA</div><h2>Unstructured assets</h2><p>Companion files indexed with workspace knowledge.</p></div><Button variant="outline" size="small" onClick={onCreateAsset}><FileUp size={14} />Add asset</Button></div>
        {loading ? <div className="hub-empty" role="status">Loading assets…</div> : assets.length ? <div className="hub-record-list">{assets.slice(0, 5).map((asset) => <div className="hub-record-row" key={asset.id}><span className="hub-record-icon hub-file"><FileArchive size={16} /></span><span className="hub-record-copy"><strong>{asset.name}</strong><small>{asset.kind} · {asset.space} · {asset.size}</small></span><span className={`status-pill status-${asset.status.toLowerCase()}`}>{asset.status}</span></div>)}</div> : <div className="hub-empty">No files yet. Add a PDF, diagram, recording, or other reference asset.</div>}
      </section>
      <section className="panel knowledge-hub-panel"><div className="hub-panel-heading"><div><div className="eyebrow">LIVE SYSTEMS</div><h2>Connected sources</h2><p>API catalogs, release notes, and operational feeds.</p></div><Button variant="outline" size="small" onClick={onCreateSource}><Plus size={14} />Add source</Button></div>
        {loading ? <div className="hub-empty" role="status">Loading connected sources…</div> : integrations.length ? <div className="hub-record-list">{integrations.map((integration) => <div className="hub-record-row" key={integration.id}><span className="hub-record-icon hub-source"><Network size={16} /></span><span className="hub-record-copy"><strong>{integration.name}</strong><small>{integration.category} · {integration.lastSynced}</small></span><span className={`status-pill${integration.connected ? ' status-published' : ' status-draft'}`}>{integration.connected ? 'Connected' : 'Setup needed'}</span></div>)}</div> : <div className="hub-empty">No live connectors configured. Add GitHub releases, an OpenAPI catalog, or a status feed.</div>}
      </section>
      <section className="panel knowledge-hub-panel taxonomy-panel" id="taxonomy-panel"><div className="hub-panel-heading"><div><div className="eyebrow">EXPLICIT METADATA</div><h2>Taxonomy & entities</h2><p>Shared terms help connect knowledge across spaces.</p></div><span className="taxonomy-count">{taxonomyTerms.length} terms</span></div>
        {canManageTaxonomy ? <form className="taxonomy-form" onSubmit={(event) => void submitTerm(event)}><label className="sr-only" htmlFor="new-taxonomy-term">Add taxonomy term</label><input id="new-taxonomy-term" value={newTerm} onChange={(event) => setNewTerm(event.target.value)} placeholder="Add a tag or entity" disabled={isAddingTerm} /><Button size="small" type="submit" isLoading={isAddingTerm} loadingText="Adding…" disabled={!newTerm.trim()}><Plus size={14} />Add term</Button></form> : <p className="taxonomy-permission-note">Only Super Admins and Space Admins can manage shared terms.</p>}
        {taxonomyError && <p className="taxonomy-error" role="alert">{taxonomyError}</p>}
        <div className="taxonomy-terms">{taxonomyTerms.map((term) => <span className="taxonomy-term" key={term}><span>#{term}</span>{canManageTaxonomy && <button type="button" title={`Remove #${term}`} aria-label={`Remove #${term}`} disabled={pendingTerm !== null} aria-busy={pendingTerm === term || undefined} onClick={() => void removeTerm(term)}>{pendingTerm === term ? <LoaderCircle className="ui-button-spinner" size={12} /> : <Trash2 size={12} />}</button>}</span>)}</div>
      </section>
      <section className="panel knowledge-hub-panel ai-context-panel"><div className="hub-panel-heading"><div><div className="eyebrow">AI CONTEXT</div><h2>Retrieval readiness</h2><p>Context and source coverage for grounded answers.</p></div><span className="hub-ai-icon"><SearchCheck size={17} /></span></div><div className="retrieval-stats"><div><strong>{models.length + assets.length + integrations.length}</strong><span>knowledge records</span></div><div><strong>{taxonomyTerms.length}</strong><span>search terms</span></div><div><strong>Not configured</strong><span>vector retrieval</span></div></div><div className="asset-note">Vector embeddings, indexing pipelines, and cited AI answers require a connected search and generation service.</div></section>
    </div>

    <div className="knowledge-models-grid">
      {models.map((model) => (
        <article className="panel knowledge-model-card" key={model.id}>
          <div className="model-card-top">
            <div>
              <div className="model-format">{model.format}</div>
              <h2>{model.name}</h2>
            </div>
            <span className={`status-pill status-${model.status.toLowerCase().replace(/\s+/g, '-')}`}>{model.status}</span>
          </div>

          <p>{model.description}</p>

          <div className="model-meta">
            <span><strong>Owner</strong>{model.owner}</span>
            <span><strong>Audience</strong>{model.audience}</span>
            <span><strong>Coverage</strong>{model.coverage}</span>
          </div>

          <div className="model-usecases">
            {model.useCases.map((useCase) => (
              <span key={useCase} className="model-usecase"><CheckCircle2 size={12} />{useCase}</span>
            ))}
          </div>
        </article>
      ))}
      {loading ? <div className="empty-state" role="status">Loading knowledge models…</div> : models.length === 0 && <div className="empty-state">No knowledge models are stored in Supabase yet.</div>}
    </div>
  </section>
}
