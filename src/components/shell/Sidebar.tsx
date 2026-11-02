import { BookOpenCheck, BookOpenText, ChartNoAxesCombined, ChevronDown, CircleHelp, FileStack, LayoutDashboard, MessageSquareText, PanelsTopLeft, Plus, ScrollText, Settings2, ShieldCheck, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import type { KnowledgeSpace, Role, View } from '../../types'
import './sidebar.css'

const navigation: { label: string; view: View; icon: LucideIcon; roles?: Role[]; count?: string }[] = [
  { label: 'Overview', view: 'overview', icon: LayoutDashboard },
  { label: 'Knowledge library', view: 'library', icon: FileStack },
  { label: 'Formats & models', view: 'models', icon: BookOpenText, roles: ['Super Admin', 'Space Admin', 'Author'] },
  { label: 'Review queue', view: 'reviews', icon: ShieldCheck, roles: ['Super Admin', 'Space Admin', 'Reviewer'], count: '8' },
  { label: 'Questions & answers', view: 'questions', icon: MessageSquareText }, { label: 'Explore spaces', view: 'spaces', icon: PanelsTopLeft },
  { label: 'Help center', view: 'help', icon: CircleHelp },
  { label: 'Analytics', view: 'analytics', icon: ChartNoAxesCombined, roles: ['Super Admin', 'Space Admin'] },
]
const administration: { label: string; view: View; icon: LucideIcon; roles: Role[] }[] = [
  { label: 'People & permissions', view: 'people', icon: Users, roles: ['Super Admin'] },
  { label: 'Workspace settings', view: 'settings', icon: Settings2, roles: ['Super Admin'] },
  { label: 'Audit trail', view: 'audit', icon: ScrollText, roles: ['Super Admin'] },
]
interface SidebarProps {
  activeView: View
  onNavigate: (view: View) => void
  role: Role
  userName: string
  spaces: KnowledgeSpace[]
  selectedSpaceName: string | null
  onSelectSpace: (name: string | null) => void
  onOpenSpace: (name: string) => void
  onCreateSpace: () => void
}

export function Sidebar({ activeView, onNavigate, role, userName, spaces, selectedSpaceName, onSelectSpace, onOpenSpace, onCreateSpace }: SidebarProps) {
  const [spacesExpanded, setSpacesExpanded] = useState(false)
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false)
  const selectedSpace = spaces.find((space) => space.name === selectedSpaceName)
  const workspaceTitle = selectedSpace?.name ?? 'Atlas Knowledge'

  return <aside className="sidebar"><div className="brand-lockup"><div className="brand-mark"><BookOpenCheck size={19} /></div><span>atlas<span className="brand-period">.</span></span></div>
    <details className="workspace-menu" open={workspaceMenuOpen} onToggle={(event) => setWorkspaceMenuOpen(event.currentTarget.open)}>
      <summary className="workspace-switcher" aria-label={`Current location: ${workspaceTitle}`}>
        <span className="workspace-avatar">{workspaceTitle[0]}</span>
        <span className="workspace-name"><strong>{workspaceTitle}</strong><small>{selectedSpace ? 'Knowledge space' : 'Knowledge workspace'}</small></span>
        <span className="workspace-chevron"><ChevronDown size={14} /></span>
      </summary>
      <div className="workspace-menu-panel">
        <button type="button" className={`workspace-option${selectedSpace ? '' : ' active'}`} onClick={() => { onSelectSpace(null); onNavigate('overview'); setWorkspaceMenuOpen(false) }}>
          <span className="workspace-option-label">Atlas Knowledge</span>
          <span className="workspace-option-pill">Workspace</span>
        </button>
        {spaces.map((space) => <button type="button" className={`workspace-option${selectedSpaceName === space.name ? ' active' : ''}`} key={space.name} onClick={() => { onOpenSpace(space.name); setWorkspaceMenuOpen(false) }}>
          <span className="workspace-option-label">{space.name}</span>
          <span className="workspace-option-dot" style={{ background: space.color === 'green' ? '#66b98a' : space.color === 'orange' ? '#d89c5f' : space.color === 'blue' ? '#73a7d1' : space.color === 'pink' ? '#d38ec0' : '#8f87c9' }} />
        </button>)}
        {role === 'Super Admin' && <button type="button" className="workspace-option create-option" onClick={() => { onCreateSpace(); setWorkspaceMenuOpen(false) }}><span className="workspace-option-label">Create space</span><span className="workspace-option-plus">+</span></button>}
      </div>
    </details>
    <div className="sidebar-label">WORKSPACE</div><nav className="sidebar-nav" aria-label="Workspace navigation">{navigation.filter((item) => !item.roles || item.roles.includes(role)).map((item) => { const Icon = item.icon; return <button className={`nav-link${activeView === item.view ? ' active' : ''}`} key={item.view} onClick={() => onNavigate(item.view)} type="button" aria-current={activeView === item.view ? 'page' : undefined}><Icon size={17} /><span>{item.label}</span>{item.count && <span className="nav-count">{item.count}</span>}</button> })}</nav>
    {administration.some((item) => item.roles.includes(role)) && <><div className="sidebar-label administration-label">ADMINISTRATION</div><nav className="sidebar-nav" aria-label="Administration">{administration.filter((item) => item.roles.includes(role)).map((item) => { const Icon = item.icon; return <button className={`nav-link${activeView === item.view ? ' active' : ''}`} key={item.view} onClick={() => onNavigate(item.view)} type="button" aria-current={activeView === item.view ? 'page' : undefined}><Icon size={17} /><span>{item.label}</span></button> })}</nav></>}
    <div className={`sidebar-spaces${spacesExpanded ? ' expanded' : ''}`}>
      <div className="sidebar-space-header">
        <button className="spaces-accordion-trigger" type="button" aria-expanded={spacesExpanded} aria-controls="sidebar-space-list" onClick={() => setSpacesExpanded((expanded) => !expanded)}>
          <PanelsTopLeft size={15} /><span>YOUR SPACES</span><ChevronDown className="spaces-chevron" size={14} />
        </button>
        {role === 'Super Admin' && <button className="space-create-button" type="button" onClick={onCreateSpace} aria-label="Create a space"><Plus size={13} /><span>New</span></button>}
      </div>
      {spacesExpanded && <div className="sidebar-spaces-list" id="sidebar-space-list">{spaces.map((space) => <button className="space-link" type="button" key={space.name} onClick={() => onOpenSpace(space.name)}><i className={`space-dot dot-${space.color}`} /><span className="sidebar-space-name">{space.name}</span><span>{space.articleCount}</span></button>)}{spaces.length === 0 && <span className="spaces-empty">No spaces yet</span>}</div>}
    </div>
    <div className="sidebar-bottom"><button className="help-link" type="button" onClick={() => onNavigate('help')}><CircleHelp size={17} />Help center <span>↗</span></button><div className="sidebar-profile"><div className="profile-avatar">{userName.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'U'}</div><div><strong>{userName || 'Account'}</strong><small>{role}</small></div><button type="button" aria-label="Account menu">···</button></div></div>
  </aside>
}