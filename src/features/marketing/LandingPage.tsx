import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  FileText,
  Layers3,
  MessageSquareText,
  PanelsTopLeft,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import './landing-page.css'

interface LandingPageProps {
  onOpenLogin: () => void
}

const features = [
  {
    icon: BookOpenText,
    tone: 'lp-fi-green',
    title: 'Knowledge library',
    body: 'Capture Markdown articles, SOPs, FAQs, and post-mortems with categories, tags, comments, feedback, bookmarks, and version history.',
  },
  {
    icon: Layers3,
    tone: 'lp-fi-blue',
    title: 'Team spaces',
    body: 'Organize knowledge by team or domain with space-level membership and access controls so the right people see the right content.',
  },
  {
    icon: ShieldCheck,
    tone: 'lp-fi-gold',
    title: 'Review & publishing',
    body: 'Move drafts through a review queue to published, trusted knowledge. Track status, request review, and archive when content retires.',
  },
  {
    icon: MessageSquareText,
    tone: 'lp-fi-lilac',
    title: 'Questions & answers',
    body: 'Ask questions in a space, gather answers, vote on the most useful ones, and mark verified answers so the team trusts them.',
  },
  {
    icon: Search,
    tone: 'lp-fi-mint',
    title: 'Search & discovery',
    body: 'Find content through the library, space pages, and full-text search. Record no-result searches to surface knowledge gaps.',
  },
  {
    icon: PanelsTopLeft,
    tone: 'lp-fi-slate',
    title: 'Role-based governance',
    body: 'Assign Super Admin, Space Admin, Author, Reviewer, and Viewer roles with permissions enforced by database row-level security.',
  },
]

const steps = [
  {
    title: 'Set up spaces & invite',
    body: 'A Super Admin creates team spaces and invites members with the role and access they need.',
  },
  {
    title: 'Capture knowledge',
    body: 'Members write articles, upload files, and connect sources inside the right space.',
  },
  {
    title: 'Review & publish',
    body: 'Authors request review; reviewers and admins approve and publish trusted content.',
  },
  {
    title: 'Discover & improve',
    body: 'The team searches, bookmarks, asks questions, and keeps knowledge up to date.',
  },
]

const roles = [
  { icon: ShieldCheck, tone: 'lp-fi-green', title: 'Super Admin', body: 'Manage members, settings, spaces, and content across the workspace.' },
  { icon: Layers3, tone: 'lp-fi-blue', title: 'Space Admin', body: 'Manage content and membership for assigned spaces.' },
  { icon: FileText, tone: 'lp-fi-gold', title: 'Author', body: 'Create and edit knowledge in assigned spaces.' },
  { icon: CheckCircle2, tone: 'lp-fi-lilac', title: 'Reviewer', body: 'Work the review queue and verify answers.' },
  { icon: Users, tone: 'lp-fi-mint', title: 'Viewer', body: 'Read available knowledge and join allowed questions.' },
]

export function LandingPage({ onOpenLogin }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (id: string) => {
    setMenuOpen(false)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="lp-root">
      <a className="lp-skip-link" href="#lp-overview">Skip to content</a>

      <header className={`lp-header${scrolled ? ' is-scrolled' : ''}`}>
        <div className="lp-brand">
          <span className="lp-brand-mark"><BookOpenText size={19} /></span>
          Atlas<span className="lp-brand-period">.</span>
        </div>
        <nav className="lp-nav" aria-label="Landing sections">
          <a href="#lp-overview" onClick={(e) => { e.preventDefault(); scrollTo('lp-overview') }}>Overview</a>
          <a href="#lp-features" onClick={(e) => { e.preventDefault(); scrollTo('lp-features') }}>Features</a>
          <a href="#lp-workflow" onClick={(e) => { e.preventDefault(); scrollTo('lp-workflow') }}>Workflow</a>
          <a href="#lp-roles" onClick={(e) => { e.preventDefault(); scrollTo('lp-roles') }}>Roles</a>
        </nav>
        <div className="lp-header-actions">
          <button type="button" className="lp-signin-link" onClick={onOpenLogin}>Sign in</button>
          <button type="button" className="lp-enter-btn" onClick={onOpenLogin}>
            Enter workspace <ArrowRight size={16} />
          </button>
          <button
            type="button"
            className="lp-menu-toggle"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      <div className={`lp-mobile-menu${menuOpen ? ' is-open' : ''}`}>
        <a href="#lp-overview" onClick={(e) => { e.preventDefault(); scrollTo('lp-overview') }}>Overview</a>
        <a href="#lp-features" onClick={(e) => { e.preventDefault(); scrollTo('lp-features') }}>Features</a>
        <a href="#lp-workflow" onClick={(e) => { e.preventDefault(); scrollTo('lp-workflow') }}>Workflow</a>
        <a href="#lp-roles" onClick={(e) => { e.preventDefault(); scrollTo('lp-roles') }}>Roles</a>
        <button type="button" className="lp-enter-btn" onClick={() => { setMenuOpen(false); onOpenLogin() }}>
          Enter workspace <ArrowRight size={16} />
        </button>
      </div>

      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div>
            <span className="lp-eyebrow"><span className="lp-eyebrow-dot" /> Shared knowledge workspace</span>
            <h1>Trusted, discoverable knowledge for <span className="lp-accent">your whole team.</span></h1>
            <p className="lp-hero-lead">
              Atlas brings articles, team spaces, questions, and review workflows into one secure workspace — so the
              people who need an answer can find it, and the people who have it can share it with confidence.
            </p>
            <div className="lp-hero-cta">
              <button type="button" className="lp-btn-primary" onClick={onOpenLogin}>
                Enter workspace <ArrowRight size={18} />
              </button>
              <button type="button" className="lp-btn-secondary" onClick={() => scrollTo('lp-overview')}>
                See the overview
              </button>
            </div>
            <div className="lp-hero-trust">
              <span><CheckCircle2 size={15} /> Supabase Auth &amp; row-level security</span>
              <span><CheckCircle2 size={15} /> Spaces with membership controls</span>
              <span><CheckCircle2 size={15} /> Private file storage</span>
            </div>
          </div>

          <div className="lp-preview" aria-hidden="true">
            <div className="lp-preview-bar">
              <span className="lp-preview-dot" />
              <span className="lp-preview-dot" />
              <span className="lp-preview-dot" />
              <span className="lp-preview-title">atlas — knowledge library</span>
            </div>
            <div className="lp-preview-body">
              <div className="lp-preview-side">
                <div className="lp-ps-brand">
                  <span className="lp-brand-mark"><BookOpenText size={14} /></span>
                  Atlas
                </div>
                <div className="lp-preview-nav">
                  <span className="is-active"><PanelsTopLeft size={13} /> Overview</span>
                  <span><BookOpenText size={13} /> Library</span>
                  <span><MessageSquareText size={13} /> Questions</span>
                  <span><Layers3 size={13} /> Spaces</span>
                  <span><ShieldCheck size={13} /> Admin</span>
                </div>
              </div>
              <div className="lp-preview-main">
                <div className="lp-preview-eyebrow">WORKSPACE OVERVIEW</div>
                <h3>Knowledge at a glance</h3>
                <div className="lp-preview-metrics">
                  <div className="lp-preview-metric">
                    <div className="lp-pm-top"><span>Published</span><span className="lp-pm-icon lp-pm-mint"><BookOpenText size={15} /></span></div>
                    <strong>—</strong>
                    <small>Articles</small>
                  </div>
                  <div className="lp-preview-metric">
                    <div className="lp-pm-top"><span>In review</span><span className="lp-pm-icon lp-pm-gold"><ShieldCheck size={15} /></span></div>
                    <strong>—</strong>
                    <small>Awaiting review</small>
                  </div>
                  <div className="lp-preview-metric">
                    <div className="lp-pm-top"><span>Open questions</span><span className="lp-pm-icon lp-pm-blue"><MessageSquareText size={15} /></span></div>
                    <strong>—</strong>
                    <small>Across spaces</small>
                  </div>
                </div>
                <div className="lp-preview-list">
                  <div className="lp-preview-row">
                    <span className="lp-preview-row-icon lp-pm-mint"><FileText size={16} /></span>
                    <div className="lp-preview-row-copy">
                      <strong>On-call runbook</strong>
                      <span>Engineering · Updated recently</span>
                    </div>
                    <span className="lp-pill lp-pill-published">Published</span>
                  </div>
                  <div className="lp-preview-row">
                    <span className="lp-preview-row-icon lp-pm-gold"><FileText size={16} /></span>
                    <div className="lp-preview-row-copy">
                      <strong>Incident post-mortem</strong>
                      <span>Operations · Awaiting review</span>
                    </div>
                    <span className="lp-pill lp-pill-review">Under review</span>
                  </div>
                  <div className="lp-preview-row">
                    <span className="lp-preview-row-icon lp-pm-blue"><FileText size={16} /></span>
                    <div className="lp-preview-row-copy">
                      <strong>New-hire FAQ</strong>
                      <span>People · Draft</span>
                    </div>
                    <span className="lp-pill lp-pill-draft">Draft</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="lp-preview-caption">Illustrative preview — not live workspace data</div>
          </div>
        </div>
      </section>

      <section className="lp-section" id="lp-overview">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <span className="lp-eyebrow"><span className="lp-eyebrow-dot" /> Overview</span>
            <h2>One workspace for the knowledge your team relies on</h2>
            <p>
              Atlas organizes documentation, playbooks, and answers into spaces your team already understands. A review
              workflow keeps published content trustworthy, and search helps everyone find what they need — fast.
            </p>
          </div>
          <div className="lp-features" id="lp-features">
            {features.map((feature) => (
              <article className="lp-feature" key={feature.title}>
                <span className={`lp-feature-icon ${feature.tone}`}><feature.icon size={22} /></span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section" id="lp-workflow" style={{ background: '#f1f6f2' }}>
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <span className="lp-eyebrow"><span className="lp-eyebrow-dot" /> How it works</span>
            <h2>From empty workspace to trusted knowledge in four steps</h2>
          </div>
          <div className="lp-workflow">
            {steps.map((step, index) => (
              <div className="lp-step" key={step.title}>
                <div className="lp-step-num">{index + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                {index < steps.length - 1 && (
                  <span className="lp-step-arrow" aria-hidden="true"><ArrowRight size={15} /></span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section" id="lp-roles">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <span className="lp-eyebrow"><span className="lp-eyebrow-dot" /> Roles &amp; permissions</span>
            <h2>Access that matches how your team works</h2>
            <p>Permissions are enforced by the database, not just the interface — so every action is checked at the row level.</p>
          </div>
          <div className="lp-roles">
            {roles.map((role) => (
              <article className="lp-role" key={role.title}>
                <span className={`lp-role-icon ${role.tone}`}><role.icon size={20} /></span>
                <h3>{role.title}</h3>
                <p>{role.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-cta">
        <div className="lp-cta-card">
          <Sparkles size={28} style={{ color: '#e9b86c', justifySelf: 'center' }} />
          <h2>Ready to put your team’s knowledge to work?</h2>
          <p>Sign in to enter your Atlas workspace. New members set their own password through a secure invitation link.</p>
          <div className="lp-cta-actions">
            <button type="button" className="lp-btn-primary" onClick={onOpenLogin}>
              Sign in to Atlas <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <span className="lp-brand-mark"><BookOpenText size={15} /></span>
            Atlas<span className="lp-brand-period">.</span>
          </div>
          <span className="lp-footer-copy">A shared knowledge workspace for teams.</span>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
