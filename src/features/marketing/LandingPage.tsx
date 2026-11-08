import { ArrowRight, BookOpenCheck, BookOpenText, FileStack, FolderKanban, MessageSquareText, Search, ShieldCheck, Sparkles, Users, Workflow } from 'lucide-react'
import './landing-page.css'

interface LandingPageProps {
  onOpenLogin: () => void
}

const features = [
  { icon: FileStack, title: 'Knowledge library', description: 'Create Markdown articles, organize them by space and category, and keep a restorable version history.' },
  { icon: FolderKanban, title: 'Spaces for every team', description: 'Give each team a focused home for its articles, questions, and files, with access managed by membership.' },
  { icon: Workflow, title: 'Review & publishing', description: 'Move content from draft through review to published, so teams know what is ready to rely on.' },
  { icon: MessageSquareText, title: 'Questions & answers', description: 'Ask questions in a space, contribute answers, vote, and let reviewers verify helpful responses.' },
  { icon: Search, title: 'Find what you need', description: 'Browse and search workspace articles, refine by space, and use tags and categories to aid discovery.' },
  { icon: ShieldCheck, title: 'Governed access', description: 'Use workspace roles, space membership, Supabase row-level security, and an audit trail to support accountable collaboration.' },
]

const workflow = [
  { title: 'Set up your workspace', description: 'Admins create spaces and invite teammates with an appropriate role and access.' },
  { title: 'Capture knowledge', description: 'Authors write articles, add categories and tags, or upload files to a space.' },
  { title: 'Review together', description: 'Submit drafts for review; reviewers and admins help verify and publish content.' },
  { title: 'Discover and improve', description: 'Search the library, bookmark useful articles, ask questions, and use search gaps to spot missing answers.' },
]

const roles = [
  { name: 'Super Admin', detail: 'Workspace-wide administration' },
  { name: 'Space Admin', detail: 'Manage assigned spaces' },
  { name: 'Author', detail: 'Create and edit knowledge' },
  { name: 'Reviewer', detail: 'Review content and answers' },
  { name: 'Viewer', detail: 'Read and participate' },
]

export function LandingPage({ onOpenLogin }: LandingPageProps) {
  return (
    <main className="atlas-landing-page">
      <header className="atlas-header">
        <a className="atlas-brand" href="#home" aria-label="Atlas home">
          <span className="atlas-brand-mark"><BookOpenCheck size={19} /></span>
          <span>atlas<span className="atlas-brand-period">.</span></span>
        </a>
        <nav className="atlas-nav" aria-label="Main navigation">
          <a href="#overview">Overview</a>
          <a href="#how-it-works">How it works</a>
          <a href="#roles">Roles</a>
        </nav>
        <button type="button" className="atlas-header-button" onClick={onOpenLogin}>Sign in <ArrowRight size={15} /></button>
      </header>

      <section id="home" className="atlas-hero">
        <div className="atlas-hero-copy">
          <div className="atlas-eyebrow"><span />A shared knowledge workspace</div>
          <h1>Make your team’s knowledge easy to trust and easy to find.</h1>
          <p>Atlas brings articles, team spaces, review workflows, and questions &amp; answers together in one secure workspace—so useful knowledge can keep moving with your team.</p>
          <div className="atlas-cta-row">
            <button type="button" className="atlas-button atlas-button-primary" onClick={onOpenLogin}>Enter workspace <ArrowRight size={16} /></button>
            <a className="atlas-button atlas-button-secondary" href="#overview">Explore Atlas</a>
          </div>
          <div className="atlas-hero-note"><ShieldCheck size={15} /><span>Workspace roles and space membership help control who can read and contribute.</span></div>
        </div>

        <div className="atlas-product-card" aria-label="Atlas workspace feature preview">
          <div className="atlas-product-topline"><div className="atlas-product-logo"><BookOpenText size={17} /></div><div><span className="atlas-product-label">YOUR TEAM’S KNOWLEDGE</span><strong>One connected workspace</strong></div><Sparkles className="atlas-sparkle" size={18} /></div>
          <div className="atlas-product-search"><Search size={15} /><span>Search trusted articles, spaces, and answers</span><kbd>⌘ K</kbd></div>
          <div className="atlas-product-list">
            <div className="atlas-product-row"><span className="atlas-row-icon atlas-icon-green"><FileStack size={16} /></span><span className="atlas-row-copy"><strong>Knowledge library</strong><small>Articles, SOPs, guides, and version history</small></span><span className="atlas-row-status">PUBLISHED</span></div>
            <div className="atlas-product-row"><span className="atlas-row-icon atlas-icon-gold"><FolderKanban size={16} /></span><span className="atlas-row-copy"><strong>Team spaces</strong><small>Knowledge organized around your teams</small></span><ArrowRight size={15} className="atlas-row-arrow" /></div>
            <div className="atlas-product-row"><span className="atlas-row-icon atlas-icon-blue"><ShieldCheck size={16} /></span><span className="atlas-row-copy"><strong>Review queue</strong><small>Drafts move through a clear approval flow</small></span><span className="atlas-row-status atlas-status-review">IN REVIEW</span></div>
            <div className="atlas-product-row"><span className="atlas-row-icon atlas-icon-lilac"><MessageSquareText size={16} /></span><span className="atlas-row-copy"><strong>Questions &amp; answers</strong><small>Share context and verify useful answers</small></span><ArrowRight size={15} className="atlas-row-arrow" /></div>
          </div>
          <div className="atlas-product-footer"><span className="atlas-presence-dots"><i /><i /><i /></span><span>Built for shared understanding</span><span className="atlas-footer-secure"><ShieldCheck size={13} /> Access-aware</span></div>
        </div>
      </section>

      <section id="overview" className="atlas-section">
        <div className="atlas-section-heading">
          <div className="atlas-eyebrow"><span />The workspace, at a glance</div>
          <h2>Everything your team needs to keep knowledge useful.</h2>
          <p>From the first draft to a verified answer, Atlas gives knowledge a clear home and a collaborative lifecycle.</p>
        </div>
        <div className="atlas-feature-grid">
          {features.map(({ icon: Icon, title, description }) => (
            <article key={title} className="atlas-feature-card">
              <span className="atlas-feature-icon"><Icon size={19} /></span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="atlas-section atlas-workflow-section">
        <div className="atlas-section-heading">
          <div className="atlas-eyebrow"><span />A clear knowledge lifecycle</div>
          <h2>Capture it. Review it. Put it to work.</h2>
        </div>
        <div className="atlas-workflow-grid">
          {workflow.map((step, index) => (
            <article key={step.title} className="atlas-workflow-card">
              <span className="atlas-step-number">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="roles" className="atlas-section atlas-access-section">
        <div className="atlas-access-copy">
          <div className="atlas-eyebrow"><span />Designed for team collaboration</div>
          <h2>Clear roles. Space-aware access.</h2>
          <p>Each role has a purpose, while Supabase row-level security applies access rules to workspace data. Space membership matters for member-only spaces.</p>
        </div>
        <div className="atlas-role-list">
          {roles.map((role) => <div key={role.name} className="atlas-role-item"><span className="atlas-role-check"><Users size={15} /></span><span><strong>{role.name}</strong><small>{role.detail}</small></span><ArrowRight size={14} /></div>)}
        </div>
      </section>

      <section className="atlas-section atlas-final-section">
        <div className="atlas-final-panel">
          <div><div className="atlas-eyebrow atlas-eyebrow-light"><span />Your knowledge, together</div><h2>Give good knowledge a place to grow.</h2><p>Sign in to your Atlas workspace and pick up where your team left off.</p></div>
          <button type="button" className="atlas-button atlas-button-light" onClick={onOpenLogin}>Sign in to Atlas <ArrowRight size={16} /></button>
        </div>
      </section>

      <footer className="atlas-footer"><a className="atlas-brand atlas-footer-brand" href="#home"><span className="atlas-brand-mark"><BookOpenCheck size={17} /></span><span>atlas<span className="atlas-brand-period">.</span></span></a><span>Atlas Knowledge Workspace</span><a href="#home">Back to top ↑</a></footer>
    </main>
  )
}

export default LandingPage
