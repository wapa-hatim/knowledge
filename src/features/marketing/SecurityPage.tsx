import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  KeyRound,
  Layers3,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { MarketingLayout, type MarketingPage } from './MarketingLayout'
import './landing-page.css'

interface SecurityPageProps {
  onOpenLogin: () => void
  onNavigate: (page: MarketingPage) => void
}

const securityPillars = [
  {
    icon: ShieldCheck,
    tone: 'lp-fi-green',
    title: 'Row-level security on every table',
    body: 'Access is checked by Postgres row-level security policies on every read and write. The interface never grants access the database would deny — if a user is not a member of a space, the policy blocks the action regardless of what buttons are visible.',
  },
  {
    icon: KeyRound,
    tone: 'lp-fi-blue',
    title: 'Supabase Auth with email & password',
    body: 'Authentication is handled by Supabase Auth. Members sign in with their work email and a password they choose. Password resets send a recovery link, and account suspension prevents sign-in until reactivated.',
  },
  {
    icon: Users,
    tone: 'lp-fi-gold',
    title: 'Invitation-based membership',
    body: 'A Super Admin invites members and assigns their role and space. Invitations do not contain a shared password — each invitee sets their own through a secure Supabase link, with a minimum of 12 characters.',
  },
  {
    icon: Layers3,
    tone: 'lp-fi-lilac',
    title: 'Space-level access controls',
    body: 'Spaces can be workspace-visible or member-only. Actions on articles, questions, and files in a member-only space require a space_members entry. Anonymous users cannot access either kind of space.',
  },
  {
    icon: BookOpenText,
    tone: 'lp-fi-mint',
    title: 'Private file storage',
    body: 'Uploaded files are stored in a private Supabase Storage bucket. Access is gated by space membership, and signed URLs are generated on demand rather than exposing files publicly.',
  },
  {
    icon: ScrollText,
    tone: 'lp-fi-slate',
    title: 'Audit trail',
    body: 'Workspace and content events are recorded in an audit log. Super Admins can inspect who created, updated, published, archived, or deleted content, and when workspace membership changed.',
  },
]

export function SecurityPage({ onOpenLogin, onNavigate }: SecurityPageProps) {
  return (
    <MarketingLayout activePage="security" onOpenLogin={onOpenLogin} onNavigate={onNavigate}>
      <section className="lp-section lp-page-hero">
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <span className="lp-eyebrow"><span className="lp-eyebrow-dot" /> Security &amp; access</span>
            <h2>Access enforced by the database, not just the interface</h2>
            <p>Atlas relies on Supabase Auth and Postgres row-level security so that every action is checked at the data layer — not only by which buttons the UI happens to show.</p>
          </div>
        </div>
      </section>

      <section className="lp-section" style={{ paddingTop: 0 }}>
        <div className="lp-section-inner">
          <div className="lp-features">
            {securityPillars.map((pillar) => (
              <article className="lp-feature" key={pillar.title}>
                <span className={`lp-feature-icon ${pillar.tone}`}><pillar.icon size={22} /></span>
                <h3>{pillar.title}</h3>
                <p>{pillar.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section" style={{ background: '#f1f6f2' }}>
        <div className="lp-section-inner">
          <div className="lp-section-head">
            <span className="lp-eyebrow"><span className="lp-eyebrow-dot" /> How access works</span>
            <h2>From invitation to authenticated request</h2>
          </div>
          <div className="lp-workflow">
            <div className="lp-step">
              <div className="lp-step-num">1</div>
              <h3>Admin invites</h3>
              <p>A Super Admin invites a member with a role and space assignment through the manage-workspace-user Edge Function.</p>
            </div>
            <div className="lp-step">
              <div className="lp-step-num">2</div>
              <h3>Member sets password</h3>
              <p>The invitee receives a Supabase email link and chooses a password. First-time setup is required before entering the workspace.</p>
              <span className="lp-step-arrow" aria-hidden="true"><ArrowRight size={15} /></span>
            </div>
            <div className="lp-step">
              <div className="lp-step-num">3</div>
              <h3>Auth session</h3>
              <p>On sign-in, Supabase Auth issues a session. The app loads the member profile, role, and space memberships.</p>
              <span className="lp-step-arrow" aria-hidden="true"><ArrowRight size={15} /></span>
            </div>
            <div className="lp-step">
              <div className="lp-step-num">4</div>
              <h3>RLS checks every request</h3>
              <p>Each query runs against Postgres RLS policies. If the member lacks space membership or the role does not permit the action, the database rejects it.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section">
        <div className="lp-section-inner">
          <div className="lp-section-head" style={{ textAlign: 'left', marginLeft: 0, marginRight: 0 }}>
            <span className="lp-eyebrow"><span className="lp-eyebrow-dot" /> What this means for your team</span>
            <h2 style={{ textAlign: 'left' }}>Practical guarantees</h2>
          </div>
          <ul className="lp-guarantee-list">
            <li><CheckCircle2 size={18} /> A Reviewer who is not a space member cannot publish an article in that space — the policy blocks it.</li>
            <li><CheckCircle2 size={18} /> Suspended members cannot sign in or load workspace data until reactivated.</li>
            <li><CheckCircle2 size={18} /> Files in private storage are only accessible to members of their space via signed URLs.</li>
            <li><CheckCircle2 size={18} /> Every workspace and content event is recorded in the audit trail for Super Admin review.</li>
            <li><CheckCircle2 size={18} /> No shared passwords — each member sets and changes their own through Supabase Auth.</li>
          </ul>
        </div>
      </section>

      <section className="lp-cta">
        <div className="lp-cta-card">
          <Sparkles size={28} style={{ color: '#e9b86c', justifySelf: 'center' }} />
          <h2>Your team’s knowledge, secured at the database level</h2>
          <p>Sign in to see how roles, spaces, and row-level security work together in your workspace.</p>
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

export default SecurityPage
