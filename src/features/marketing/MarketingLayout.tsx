import { useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, BookOpenText } from 'lucide-react'
import './landing-page.css'

export type MarketingPage = 'home' | 'features' | 'security'

interface MarketingLayoutProps {
  activePage: MarketingPage
  onOpenLogin: () => void
  onNavigate: (page: MarketingPage) => void
  children: ReactNode
}

const navLinks: { label: string; page: MarketingPage }[] = [
  { label: 'Home', page: 'home' },
  { label: 'Features', page: 'features' },
  { label: 'Security', page: 'security' },
]

export function MarketingLayout({ activePage, onOpenLogin, onNavigate, children }: MarketingLayoutProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navigate = (page: MarketingPage) => {
    setMenuOpen(false)
    onNavigate(page)
  }

  return (
    <div className="lp-root">
      <a className="lp-skip-link" href="#lp-content">Skip to content</a>

      <header className={`lp-header${scrolled ? ' is-scrolled' : ''}`}>
        <button type="button" className="lp-brand" onClick={() => navigate('home')}>
          <span className="lp-brand-mark"><BookOpenText size={19} /></span>
          Atlas<span className="lp-brand-period">.</span>
        </button>
        <nav className="lp-nav" aria-label="Marketing navigation">
          {navLinks.map((link) => (
            <a
              key={link.page}
              href={`/${link.page === 'home' ? '' : link.page}`}
              className={activePage === link.page ? 'is-current' : ''}
              onClick={(e) => { e.preventDefault(); navigate(link.page) }}
            >
              {link.label}
            </a>
          ))}
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
        {navLinks.map((link) => (
          <a
            key={link.page}
            href={`/${link.page === 'home' ? '' : link.page}`}
            onClick={(e) => { e.preventDefault(); navigate(link.page) }}
          >
            {link.label}
          </a>
        ))}
        <button type="button" className="lp-enter-btn" onClick={() => { setMenuOpen(false); onOpenLogin() }}>
          Enter workspace <ArrowRight size={16} />
        </button>
      </div>

      <main id="lp-content">{children}</main>

      <footer className="lp-footer">
        <div className="lp-footer-grid">
          <div className="lp-footer-col lp-footer-brand-col">
            <div className="lp-footer-brand">
              <span className="lp-brand-mark"><BookOpenText size={15} /></span>
              Atlas<span className="lp-brand-period">.</span>
            </div>
            <p>A shared knowledge workspace for teams. Capture, review, and discover the knowledge your organization relies on.</p>
          </div>
          <div className="lp-footer-col">
            <h4>Product</h4>
            <button type="button" onClick={() => navigate('home')}>Overview</button>
            <button type="button" onClick={() => navigate('features')}>Features</button>
            <button type="button" onClick={() => navigate('security')}>Security &amp; access</button>
          </div>
          <div className="lp-footer-col">
            <h4>Workspace</h4>
            <button type="button" onClick={onOpenLogin}>Sign in</button>
            <button type="button" onClick={onOpenLogin}>Enter workspace</button>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>&copy; {new Date().getFullYear()} Atlas Knowledge Workspace</span>
          <span className="lp-footer-tagline">Built with Supabase, React, and row-level security.</span>
        </div>
      </footer>
    </div>
  )
}

export default MarketingLayout
