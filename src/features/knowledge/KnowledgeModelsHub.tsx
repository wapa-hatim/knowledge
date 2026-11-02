import { ArrowRight, BookOpenText, CheckCircle2, Layers3, ShieldCheck } from 'lucide-react'
import type { KnowledgeModel, View } from '../../types'
import { Button } from '../../components/ui/Button'

interface KnowledgeModelsHubProps {
  models: KnowledgeModel[]
  onNavigate: (view: View) => void
}

const modelHighlights = [
  { label: 'Managed models', value: '8', delta: '+2 this quarter', icon: Layers3, tone: 'tone-mint' },
  { label: 'Templates in use', value: '14', delta: 'Across 5 spaces', icon: BookOpenText, tone: 'tone-blue' },
  { label: 'Coverage', value: '92%', delta: 'Indexed and searchable', icon: ShieldCheck, tone: 'tone-peach' },
]

export function KnowledgeModelsHub({ models, onNavigate }: KnowledgeModelsHubProps) {
  return <section className="page-section">
    <div className="page-heading">
      <div>
        <div className="eyebrow"><span className="eyebrow-dot" />KNOWLEDGE SYSTEM</div>
        <h1>Formats & models hub</h1>
        <p>Standardize how knowledge is created, reviewed, and reused across the workspace.</p>
      </div>
      <div className="heading-actions">
        <Button variant="outline" onClick={() => onNavigate('library')}>Open library</Button>
        <Button onClick={() => onNavigate('questions')}>Ask Atlas</Button>
      </div>
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
    </div>
  </section>
}
