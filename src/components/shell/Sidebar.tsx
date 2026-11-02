import { BookOpenCheck, ChartNoAxesCombined, CircleHelp, FileStack, LayoutDashboard, MessageSquareText, ShieldCheck } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Role, View } from '../../types'

const navigation: { label: string; view: View; icon: LucideIcon; roles?: Role[]; count?: string }[] = [
  { label: 'Overview', view: 'overview', icon: LayoutDashboard }, { label: 'Knowledge library', view: 'library', icon: FileStack },
  { label: 'Review queue', view: 'reviews', icon: ShieldCheck, roles: ['Super Admin', 'Space Admin', 'Reviewer'], count: '8' },
  { label: 'Questions & answers', view: 'questions', icon: MessageSquareText }, { label: 'Analytics', view: 'analytics', icon: ChartNoAxesCombined, roles: ['Super Admin', 'Space Admin'] },
]
interface SidebarProps { activeView: View; onNavigate: (view: View) => void; role: Role }

export function Sidebar({ activeView, onNavigate, role }: SidebarProps) {
  return <aside className="sidebar"><div className="brand-lockup"><div className="brand-mark"><BookOpenCheck size={19} /></div><span>atlas<span className="brand-period">.</span></span></div>
    <button className="workspace-switcher" type="button" aria-label="Current workspace: Northstar Studio"><span className="workspace-avatar">N</span><span className="workspace-name"><strong>Northstar Studio</strong><small>Knowledge workspace</small></span><span className="workspace-chevron">⌄</span></button>
    <div className="sidebar-label">WORKSPACE</div><nav className="sidebar-nav" aria-label="Main navigation">{navigation.filter((item) => !item.roles || item.roles.includes(role)).map((item) => { const Icon = item.icon; return <button className={`nav-link${activeView === item.view ? ' active' : ''}`} key={item.view} onClick={() => onNavigate(item.view)} type="button" aria-current={activeView === item.view ? 'page' : undefined}><Icon size={17} /><span>{item.label}</span>{item.count && <span className="nav-count">{item.count}</span>}</button> })}</nav>
    <div className="sidebar-spaces"><div className="sidebar-label space-label">YOUR SPACES <button type="button" aria-label="Add a space">+</button></div><button className="space-link" type="button"><i className="space-dot dot-green" />Engineering <span>12</span></button><button className="space-link" type="button"><i className="space-dot dot-orange" />Product & Design</button><button className="space-link" type="button"><i className="space-dot dot-blue" />People & Finance</button><button className="space-link" type="button"><i className="space-dot dot-pink" />Customer Success</button></div>
    <div className="sidebar-bottom"><button className="help-link" type="button"><CircleHelp size={17} />Help center <span>↗</span></button><div className="sidebar-profile"><div className="profile-avatar">AY</div><div><strong>Amina Yusuf</strong><small>{role}</small></div><button type="button" aria-label="Account menu">···</button></div></div>
  </aside>
}