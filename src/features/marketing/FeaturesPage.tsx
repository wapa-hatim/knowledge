import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Layers3,
  MessageSquareText,
  PanelsTopLeft,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { MarketingLayout, type MarketingPage } from './MarketingLayout'
import './landing-page.css'

interface FeaturesPageProps {
  onOpenLogin: () => void
  onNavigate: (page: MarketingPage) => void
}

const featureDetails = [
  {
    icon: BookOpenText,
    tone: 'lp-fi-green',
    title: 'Knowledge library',
    intro: 'A central home for Markdown articles, SOPs, FAQs, runbooks, and post-mortems.',
    points: [
      'Rich text editing with autosave and version history',
      'Categories and tags scoped to each space',
      'Comments, helpful / not-helpful feedback, and bookmarks',
      'Draft, Under review, Published, and Archived statuses',
    ],
  },
  {
    icon: Layers3,
    tone: 'lp-fi-blue',
    title: 'Team spaces',
    intro: 'Organize knowledge by team or domain with access controls that match your structure.',
    points: [
      'Space-level membership for sensitive content',
      'Workspace-visible spaces for broad collaboration',
      'Categories scoped per space for clean organization',
      'Space pages with article counts and recent activity',
    ],
  },
  {
    icon: ShieldCheck,
    tone: 'lp-fi-gold',
    title: 'Review & publishing workflow',
    intro: 'Keep published content trustworthy with a structured review process.',
    points: [
      'Authors request review from a Draft',
      'Reviewers and admins approve to Publish',
      'Archive outdated content without losing history',
      'Review queue shows everything awaiting attention',
    ],
  },
  {
    icon: MessageSquareText,
    tone: 'lp-fi-lilac',
    title: 'Questions & answers',
    intro: 'Capture tribal knowledge in a Q&A format with community voting.',
    points: [
      'Ask questions within a space',
      'Members vote on the most useful answers',
      'Reviewers and admins verify answers',
      'One vote per user, removable by voting again',
    ],
  },
  {
    icon: Search,
    tone: 'lp-fi-mint',
    title: 'Search & discovery',
    intro: 'Help everyone find what they need, and learn what is missing.',
    points: [
      'Full-text search across titles, summaries, bodies, and tags',
      'Library, space pages, and search results surfaces',
      'No-result searches are recorded to surface knowledge gaps',
      'Workspace analytics show article views and search gaps',
    ],
  },
  {
    icon: PanelsTopLeft,
    tone: 'lp-fi-slate',
    title: 'Role-based governance',
    intro: 'Five roles with permissions enforced at the database level, not just in the UI.',
    points: [
      'Super Admin, Space Admin, Author, Reviewer, and Viewer',
      'Row-level security checks every read and write',
      'Space membership required for actions in member-only spaces',
      'Audit trail records workspace and content events',
    ],
  },
]

export function FeaturesPage({ onOpenLogin, onNavigate }: FeaturesPageProps) {
  return (
    <MarketingLayout activePage="features" onOpenLogin={onOpenLogin} onNavigate={onNavigate}>
      <section className="lp-section lp-page-hero">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <span className="lp-eyebrow"><span className="lp-eyebrow-dot" /> Features</span>
            <h2>Everything your team needs to manage shared knowledge</h2>
            <p>From writing a first draft to publishing trusted runbooks, Atlas supports the full lifecycle of team knowledge.</p>
          </div>
        </div>
      </section>

      <section className="lp-section" style={{ paddingTop: 0 }}>
        <div className="lp-section-inner lp-feature-detail-list">
          {featureDetails.map((feature, index) => (
            <div className={`lp-feature-detail${index % 2 === 1 ? ' is-reversed' : ''}`} key={feature.title}>
              <div className="lp-feature-detail-text">
                <span className={`lp-feature-icon ${feature.tone}`}><feature.icon size={26} /></span>
                <h3>{feature.title}</h3>
                <p className="lp-feature-detail-intro">{feature.intro}</p>
                <ul className="lp-feature-points">
                  {feature.points.map((point) => (
                    <li key={point}><CheckCircle2 size={16} /> {point}</li>
                  ))}
                </ul>
              </div>
              <div className={`lp-feature-detail-card lp-fd-card-${index}`} aria-hidden="true">
                <div className="lp-fd-card-bar">
                  <span className="lp-preview-dot" />
                  <span className="lp-preview-dot" />
                  <span className="lp-preview-dot" />
                </div>
                <div className="lp-fd-card-body">
                  <feature.icon size={32} className="lp-fd-card-icon" />
                  <div className="lp-fd-card-lines">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-cta">
        <div className="lp-cta-card">
          <Sparkles size={28} style={{ color: '#e9b86c', justifySelf: 'center' }} />
          <h2>See it in your own workspace</h2>
          <p>Sign in to explore the knowledge library, spaces, and review workflow with your team.</p>
          <div className="lp-cta-actions">
            <button type="button" className="lp-btn-primary" onClick={onOpenLogin}>
              Sign in to Atlas <ArrowRight size={18} />
            </button>
            <button type="button" className="lp-btn-secondary" onClick={() => onNavigate('home')}>
              Back to overview
            </button>
          </div>
        </div>
      </section>
    </MarketingLayout>
  )
}

export default FeaturesPage
