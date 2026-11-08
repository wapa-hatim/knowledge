import { ArrowRight, BookOpenCheck, BriefcaseBusiness, FileStack, FolderKanban, Layers3, Search, ShieldCheck, Sparkles, Users, Workflow } from 'lucide-react'

interface LandingPageProps {
  onOpenLogin: () => void
}

const features = [
  {
    icon: FileStack,
    title: 'Knowledge library',
    description: 'Turn scattered documentation into a searchable, organized library of trusted articles and sources.',
  },
  {
    icon: FolderKanban,
    title: 'Spaces & categories',
    description: 'Organize knowledge by team, function, or project with scoped spaces and structured categories.',
  },
  {
    icon: Workflow,
    title: 'Review workflow',
    description: 'Move drafts through review and approval with clear status tracking from draft to published.',
  },
  {
    icon: Users,
    title: 'Team collaboration',
    description: 'Invite members, assign roles, and align your team around the right answer at the right time.',
  },
  {
    icon: Search,
    title: 'Search & discovery',
    description: 'Surface the right content fast through search, tags, taxonomy, and article metadata.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure access',
    description: 'Govern work with role-based access, audit history, and workspace rules that protect sensitive content.',
  },
]

const workflow = [
  'Create or invite teammates into a shared workspace.',
  'Organize content by space, category, and tag.',
  'Draft articles, upload files, and define knowledge models.',
  'Review, publish, and keep information current over time.',
]

const roles = ['Super Admin', 'Space Admin', 'Author', 'Reviewer', 'Viewer']

export function LandingPage({ onOpenLogin }: LandingPageProps) {
  return (
    <main className="atlas-landing-page">
      <header className="atlas-header">
        <div className="atlas-brand">
          <div className="brand-mark brand-mark-large">
            <BookOpenCheck size={18} />
          </div>
          <span>Atlas</span>
        </div>

        <nav className="atlas-nav" aria-label="Main navigation">
          <a href="#overview">Overview</a>
          <a href="#how-it-works">How it works</a>
          <a href="#roles">Roles</a>
        </nav>

        <button type="button" className="atlas-header-button" onClick={onOpenLogin}>
          Sign in
        </button>
      </header>

      <section className="atlas-hero">
        <div className="atlas-hero-copy">
          <div className="eyebrow eyebrow-landing">
            <span className="eyebrow-dot" />Atlas knowledge workspace
          </div>
          <h1>Trusted knowledge for the way your team actually works.</h1>
          <p>
            Atlas brings your internal docs, spaces, reviews, Q&amp;A, and team knowledge into one secure,
            searchable workspace designed for clarity and momentum.
          </p>

          <div className="atlas-cta-row">
            <button type="button" className="ui-button ui-button-primary" onClick={onOpenLogin}>
              Enter workspace <ArrowRight size={16} />
            </button>
            <a className="ui-button ui-button-outline" href="#overview">
              Explore platform
            </a>
          </div>

          <div className="atlas-proof-row">
            <div>
              <strong>5</strong>
              <span>Workspace roles</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>Shared access</span>
            </div>
            <div>
              <strong>100%</strong>
              <span>Team-centered</span>
            </div>
          </div>
        </div>

        <div className="atlas-hero-panel" aria-label="Platform overview">
          <div className="hero-panel-top">
            <div>
              <span className="panel-chip">Workspace</span>
              <h2>Atlas overview</h2>
            </div>
            <Sparkles size={18} />
          </div>

          <div className="panel-metric-grid">
            <div className="mini-metric mini-metric-green">
              <span>Articles</span>
              <strong>1.2k+</strong>
            </div>
            <div className="mini-metric mini-metric-gold">
              <span>Spaces</span>
              <strong>18</strong>
            </div>
            <div className="mini-metric mini-metric-blue">
              <span>Review queue</span>
              <strong>8</strong>
            </div>
            <div className="mini-metric mini-metric-lilac">
              <span>Answers</span>
              <strong>96</strong>
            </div>
          </div>

          <div className="hero-stack">
            <div className="stack-row">
              <div className="stack-icon stack-green"><FileStack size={15} /></div>
              <div>
                <strong>Knowledge library</strong>
                <small>Search and browse trusted records</small>
              </div>
            </div>
            <div className="stack-row">
              <div className="stack-icon stack-gold"><BriefcaseBusiness size={15} /></div>
              <div>
                <strong>Spaces</strong>
                <small>Update working knowledge by team</small>
              </div>
            </div>
            <div className="stack-row">
              <div className="stack-icon stack-blue"><Layers3 size={15} /></div>
              <div>
                <strong>Formats &amp; models</strong>
                <small>Standardize content and sources</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="overview" className="atlas-section">
        <div className="section-heading">
          <div className="eyebrow eyebrow-landing">
            <span className="eyebrow-dot" />Everything in one place
          </div>
          <h2>Built for how teams capture, share, and trust knowledge.</h2>
        </div>

        <div className="feature-grid">
          {features.map(({ icon: Icon, title, description }) => (
            <article key={title} className="feature-card">
              <div className="feature-icon">
                <Icon size={18} />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="atlas-section atlas-steps-section">
        <div className="section-heading narrow-heading">
          <div className="eyebrow eyebrow-landing">
            <span className="eyebrow-dot" />How Atlas works
          </div>
          <h2>A simple path from knowledge creation to confident decision-making.</h2>
        </div>

        <div className="steps-grid">
          {workflow.map((step, index) => (
            <div key={step} className="step-card">
              <span className="step-number">0{index + 1}</span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="roles" className="atlas-section atlas-roles-section">
        <div className="section-heading narrow-heading">
          <div className="eyebrow eyebrow-landing">
            <span className="eyebrow-dot" />Built for team roles
          </div>
          <h2>Role-based access keeps the right people aligned without losing clarity.</h2>
        </div>

        <div className="role-pills" aria-label="Atlas roles">
          {roles.map((role) => (
            <span key={role} className="role-pill">
              {role}
            </span>
          ))}
        </div>
      </section>

      <section className="atlas-section atlas-final-cta">
        <div className="final-cta-panel">
          <div>
            <div className="eyebrow eyebrow-landing">
              <span className="eyebrow-dot" />Ready to begin?
            </div>
            <h2>Keep your team’s knowledge organized, actionable, and trusted.</h2>
          </div>
          <button type="button" className="ui-button ui-button-primary" onClick={onOpenLogin}>
            Open sign in
          </button>
        </div>
      </section>
    </main>
  )
}

export default LandingPage
