import { useMemo, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Activity, ArrowDownUp, Ban, Check, ChevronDown, CircleAlert, CircleCheck, FileText, KeyRound, MailPlus, Pencil, Search, ShieldCheck, Trash2, Users, X } from 'lucide-react'
import type { AuditEvent, Role, WorkspaceSettings, WorkspaceUser } from '../../types'
import { Button } from '../../components/ui/Button'
import { resetPassword } from '../../lib/supabase'
import '../spaces/workspace-pages.css'
import './admin-actions.css'

type AdminMode = 'people' | 'settings' | 'audit'
interface AdminViewProps {
  mode: AdminMode
  role: Role
  users: WorkspaceUser[]
  events: AuditEvent[]
  spaces: string[]
  usersLoading: boolean
  usersError: string | null
  settings: WorkspaceSettings
  onSettingsChange: (settings: WorkspaceSettings) => void
  onInvite: (user: Omit<WorkspaceUser, 'id'>) => Promise<string | null>
  onUpdateUser: (user: WorkspaceUser) => Promise<string | null>
  onSetUserStatus: (userId: string, status: WorkspaceUser['status']) => Promise<string | null>
  onDeleteUser: (userId: string) => Promise<string | null>
}

export function AdminView({ mode, role, users, events, spaces, usersLoading, usersError, settings, onSettingsChange, onInvite, onUpdateUser, onSetUserStatus, onDeleteUser }: AdminViewProps) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All events')
  const [invite, setInvite] = useState({ name: '', email: '', department: '', role: 'Author' as Role, space: 'All spaces' })
  const [editingUser, setEditingUser] = useState<WorkspaceUser | null>(null)
  const [resetTarget, setResetTarget] = useState('')
  const [resetNotice, setResetNotice] = useState('')
  const [userActionError, setUserActionError] = useState('')
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const pageInfo: Record<AdminMode, { title: string; eyebrow: string; description: string }> = {
    people: { title: 'People & permissions', eyebrow: 'WORKSPACE ADMINISTRATION', description: 'Invite teammates and manage who can contribute, review, and read.' },
    settings: { title: 'Workspace settings', eyebrow: 'WORKSPACE GOVERNANCE', description: 'Set clear defaults for freshness, reviews, and collaboration.' },
    audit: { title: 'Audit trail', eyebrow: 'TRUST & ACCOUNTABILITY', description: 'A chronological record of important workspace and content events.' },
  }
  const visibleUsers = users.filter((user) => `${user.name} ${user.email} ${user.department} ${user.role} ${user.space}`.toLowerCase().includes(search.toLowerCase()))
  const visibleEvents = useMemo(() => events.filter((event) => (filter === 'All events' || event.type === filter) && `${event.actor} ${event.action} ${event.target}`.toLowerCase().includes(search.toLowerCase())), [events, filter, search])

  const submitInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!invite.email.trim()) return
    const name = invite.name.trim() || invite.email.split('@')[0]
    setUserActionError('')
    const error = await onInvite({ name, email: invite.email.trim(), department: invite.department, role: invite.role, space: invite.space, status: 'Invited' })
    if (error) {
      setUserActionError(error)
      return
    }
    setInvite({ name: '', email: '', department: '', role: 'Author', space: 'All spaces' })
    setInviteOpen(false)
  }
  const submitPasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!resetTarget.trim()) return
    const { error } = await resetPassword(resetTarget.trim())
    if (error) {
      setResetNotice(error)
      return
    }
    setResetNotice(`Password reset link sent to ${resetTarget.trim()}.`)
    setResetOpen(false)
    setResetTarget('')
  }

  const saveEditUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingUser) return
    setUserActionError('')
    const currentUser = users.find((user) => user.id === editingUser.id)
    const profileError = await onUpdateUser({ ...editingUser, email: currentUser?.email ?? editingUser.email, status: currentUser?.status ?? editingUser.status })
    if (profileError) {
      setUserActionError(profileError)
      return
    }
    const statusError = currentUser && currentUser.status !== editingUser.status
      ? await onSetUserStatus(editingUser.id, editingUser.status)
      : null
    const error = statusError
    if (error) {
      setUserActionError(error)
      return
    }
    setEditingUser(null)
  }

  const updateMember = async (user: WorkspaceUser) => {
    setPendingUserId(user.id)
    setUserActionError('')
    const error = await onUpdateUser(user)
    setUserActionError(error ?? '')
    setPendingUserId(null)
  }

  const updateMemberStatus = async (user: WorkspaceUser, status: WorkspaceUser['status']) => {
    setPendingUserId(user.id)
    setUserActionError('')
    const error = await onSetUserStatus(user.id, status)
    setUserActionError(error ?? '')
    setPendingUserId(null)
  }

  const removeMember = async (user: WorkspaceUser) => {
    if (!window.confirm(`Permanently remove ${user.name} from this workspace? Their sign-in account will be deleted.`)) return
    setPendingUserId(user.id)
    setUserActionError('')
    const error = await onDeleteUser(user.id)
    setUserActionError(error ?? '')
    setPendingUserId(null)
  }

  if (role !== 'Super Admin') return <section className="page-section admin-page"><div className="admin-data-error" role="alert">Only a Super Admin can manage workspace users and settings.</div></section>

  return <section className="page-section admin-page"><div className="page-heading"><div><div className="eyebrow">{pageInfo[mode].eyebrow}</div><h1>{pageInfo[mode].title}</h1><p>{pageInfo[mode].description}</p></div>{mode === 'people' && <Button onClick={() => setInviteOpen(true)}><MailPlus size={15} />Invite member</Button>}</div>
    {mode === 'people' && <>
      <div className="metric-grid admin-metric-grid"><article className="metric-card"><div className="metric-top"><span>Workspace members</span><span className="metric-icon tone-blue"><Users size={17} /></span></div><div className="metric-value">{users.length}</div><div className="metric-delta">Across this workspace</div></article><article className="metric-card"><div className="metric-top"><span>Active members</span><span className="metric-icon tone-mint"><Check size={17} /></span></div><div className="metric-value">{users.filter((user) => user.status === 'Active').length}</div><div className="metric-delta">With active access</div></article><article className="metric-card"><div className="metric-top"><span>Pending invites</span><span className="metric-icon tone-peach"><MailPlus size={17} /></span></div><div className="metric-value">{users.filter((user) => user.status === 'Invited').length}</div><div className="metric-delta">Awaiting acceptance</div></article></div>
      {usersError && <div className="admin-data-error" role="alert">Could not load workspace members: {usersError}</div>}{userActionError && <div className="admin-data-error" role="alert">{userActionError}</div>}
      <div className="admin-table-panel"><div className="admin-toolbar"><label className="table-search"><Search size={15} /><input placeholder="Find people" aria-label="Find people" value={search} onChange={(event) => setSearch(event.target.value)} /></label><span>Member data and permissions are managed in Supabase.</span></div><div className="table-scroll"><table className="knowledge-table admin-table"><thead><tr><th>MEMBER</th><th>DEPARTMENT</th><th>SPACE</th><th>ROLE</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{usersLoading ? <tr><td colSpan={6}>Loading members…</td></tr> : visibleUsers.map((user) => <tr key={user.id}><td><div className="admin-person"><span className="owner-avatar owner-mint">{user.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div></td><td>{user.department || '—'}</td><td>{user.space}</td><td><label className="sr-only" htmlFor={`role-${user.id}`}>Role for {user.name}</label><select className="admin-select" id={`role-${user.id}`} value={user.role} disabled={pendingUserId === user.id} onChange={(event) => void updateMember({ ...user, role: event.target.value as Role })}>{(['Super Admin', 'Space Admin', 'Author', 'Reviewer', 'Viewer'] as Role[]).map((role) => <option key={role}>{role}</option>)}</select></td><td><select className={`admin-status status-${user.status.toLowerCase()}`} aria-label={`Status for ${user.name}`} value={user.status} disabled={pendingUserId === user.id} onChange={(event) => void updateMemberStatus(user, event.target.value as WorkspaceUser['status'])}><option>Active</option><option disabled>Invited</option><option>Suspended</option></select></td><td><div className="table-actions"><button className="table-action-button" type="button" title="Edit member" aria-label={`Edit ${user.name}`} disabled={pendingUserId === user.id} onClick={() => setEditingUser(user)}><Pencil size={14} /></button><button className="table-action-button" type="button" title={user.status === 'Suspended' ? 'Reactivate member' : 'Suspend member'} aria-label={`${user.status === 'Suspended' ? 'Reactivate' : 'Suspend'} ${user.name}`} disabled={pendingUserId === user.id} onClick={() => void updateMemberStatus(user, user.status === 'Suspended' ? 'Active' : 'Suspended')}>{user.status === 'Suspended' ? <CircleCheck size={14} /> : <Ban size={14} />}</button><button className="table-action-button table-action-danger" type="button" title="Delete member" aria-label={`Delete ${user.name}`} disabled={pendingUserId === user.id} onClick={() => void removeMember(user)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div>{!usersLoading && visibleUsers.length === 0 && <div className="empty-state">{users.length ? 'No people match this search.' : 'No workspace members are present in Supabase.'}</div>}</div>
      {inviteOpen && <div className="admin-modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setInviteOpen(false) }}><form className="admin-modal" onSubmit={submitInvite}><div className="panel-heading"><div><h2>Invite a teammate</h2><p>Supabase will send a secure invitation email.</p></div><button type="button" className="dialog-close" onClick={() => setInviteOpen(false)} aria-label="Close invite dialog"><X size={16} /></button></div><label>Name<input value={invite.name} onChange={(event) => setInvite({ ...invite, name: event.target.value })} placeholder="Optional" /></label><label>Work email<input type="email" required value={invite.email} onChange={(event) => setInvite({ ...invite, email: event.target.value })} placeholder="name@company.com" /></label><div className="form-row"><label>Role<select value={invite.role} onChange={(event) => setInvite({ ...invite, role: event.target.value as Role })}>{(['Space Admin', 'Author', 'Reviewer', 'Viewer'] as Role[]).map((role) => <option key={role}>{role}</option>)}</select></label><label>Space<select value={invite.space} onChange={(event) => setInvite({ ...invite, space: event.target.value })}><option>All spaces</option>{spaces.map((space) => <option key={space}>{space}</option>)}</select></label></div><div className="question-form-actions"><Button variant="ghost" type="button" onClick={() => setInviteOpen(false)}>Cancel</Button><Button type="submit"><MailPlus size={14} />Send invite</Button></div></form></div>}
    </>}
    {mode === 'settings' && <div className="settings-layout"><section className="settings-card"><div className="settings-card-heading"><div className="settings-icon"><ShieldCheck size={17} /></div><div><h2>Content governance</h2><p>Keep shared knowledge accurate and accountable.</p></div></div><label className="setting-row"><span><strong>Require review before publishing</strong><small>New and updated articles must be approved by a reviewer.</small></span><input type="checkbox" checked={settings.reviewRequired} onChange={(event) => onSettingsChange({ ...settings, reviewRequired: event.target.checked })} /></label><label className="setting-row"><span><strong>Review cadence</strong><small>Remind owners to verify published content.</small></span><select value={settings.reviewCadenceMonths} onChange={(event) => onSettingsChange({ ...settings, reviewCadenceMonths: Number(event.target.value) as WorkspaceSettings['reviewCadenceMonths'] })}><option value={3}>Every 3 months</option><option value={6}>Every 6 months</option><option value={12}>Every 12 months</option></select></label><label className="setting-row"><span><strong>Notify owners when review is due</strong><small>Send a reminder to the article owner before the due date.</small></span><input type="checkbox" checked={settings.notifyOwners} onChange={(event) => onSettingsChange({ ...settings, notifyOwners: event.target.checked })} /></label><label className="setting-row"><span><strong>Default article visibility</strong><small>New articles inherit this access scope.</small></span><select value={settings.defaultArticleVisibility} onChange={(event) => onSettingsChange({ ...settings, defaultArticleVisibility: event.target.value as WorkspaceSettings['defaultArticleVisibility'] })}><option>Space members</option><option>All workspace members</option></select></label></section>
      <section className="settings-card"><div className="settings-card-heading"><div className="settings-icon settings-icon-blue"><KeyRound size={17} /></div><div><h2>Sign-in and access</h2><p>Identity provider and authentication configuration.</p></div></div><div className="integration-status"><span className="integration-dot" /><span><strong>Single sign-on is not connected</strong><small>OAuth2, OIDC, or SAML can be configured when an identity provider is available.</small></span><button type="button" disabled><ChevronDown size={14} />Configure</button></div><div className="security-footnote"><CircleAlert size={14} /><span>Sign-in methods and permissions must be enforced by the production API. These preview settings are stored only in this browser.</span></div><div className="question-form-actions"><Button type="button" variant="ghost" onClick={() => setResetOpen(true)}><KeyRound size={14} />Send password reset</Button></div>{resetNotice && <div className="security-footnote"><Check size={14} /><span>{resetNotice}</span></div>}</section>
      <section className="settings-card"><div className="settings-card-heading"><div className="settings-icon settings-icon-peach"><Activity size={17} /></div><div><h2>Questions & answers</h2><p>Set the defaults for team knowledge exchange.</p></div></div><label className="setting-row"><span><strong>Allow guest questions</strong><small>Viewers can post questions in the knowledge exchange.</small></span><input type="checkbox" checked={settings.allowGuestQuestions} onChange={(event) => onSettingsChange({ ...settings, allowGuestQuestions: event.target.checked })} /></label></section>
    </div>}
    {mode === 'audit' && <div className="admin-table-panel audit-panel"><div className="admin-toolbar"><label className="table-search"><Search size={15} /><input placeholder="Search people or events" aria-label="Search audit events" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label className="audit-filter"><ArrowDownUp size={14} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>All events</option><option>Content</option><option>Access</option><option>Workspace</option></select></label><span>Latest recorded workspace events from Supabase.</span></div><div className="table-scroll"><table className="knowledge-table"><thead><tr><th>EVENT</th><th>ACTOR</th><th>TARGET</th><th>DATE</th><th>TYPE</th></tr></thead><tbody>{visibleEvents.map((event) => <tr key={event.id}><td><span className={`audit-type-icon audit-${event.type.toLowerCase()}`}>{event.type === 'Content' ? <FileText size={14} /> : event.type === 'Access' ? <Users size={14} /> : <Activity size={14} />}</span><strong>{event.action}</strong></td><td>{event.actor}</td><td>{event.target}</td><td>{event.date}</td><td><span className="status-pill status-draft">{event.type}</span></td></tr>)}</tbody></table></div>{visibleEvents.length === 0 && <div className="empty-state">No recorded events match these filters.</div>}</div>}
    {editingUser && <div className="admin-modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setEditingUser(null) }}><form className="admin-modal" onSubmit={saveEditUser}><div className="panel-heading"><div><h2>Edit member</h2><p>Update this person’s profile and access details.</p></div><button type="button" className="dialog-close" onClick={() => setEditingUser(null)} aria-label="Close edit dialog"><X size={16} /></button></div><label>Name<input value={editingUser.name} onChange={(event) => setEditingUser({ ...editingUser, name: event.target.value })} /></label><label>Email<input type="email" value={editingUser.email} onChange={(event) => setEditingUser({ ...editingUser, email: event.target.value })} /></label><div className="form-row"><label>Department<input value={editingUser.department} onChange={(event) => setEditingUser({ ...editingUser, department: event.target.value })} /></label><label>Space<select value={editingUser.space} onChange={(event) => setEditingUser({ ...editingUser, space: event.target.value })}>{['Engineering', 'Product & Design', 'People & Finance', 'Customer Success', 'Security', 'All spaces'].map((space) => <option key={space}>{space}</option>)}</select></label></div><div className="form-row"><label>Role<select value={editingUser.role} onChange={(event) => setEditingUser({ ...editingUser, role: event.target.value as Role })}>{(['Super Admin', 'Space Admin', 'Author', 'Reviewer', 'Viewer'] as Role[]).map((role) => <option key={role}>{role}</option>)}</select></label><label>Status<select value={editingUser.status} onChange={(event) => setEditingUser({ ...editingUser, status: event.target.value as WorkspaceUser['status'] })}><option>Active</option><option>Invited</option><option>Suspended</option></select></label></div><div className="question-form-actions"><Button variant="ghost" type="button" onClick={() => setEditingUser(null)}>Cancel</Button><Button type="submit">Save changes</Button></div></form></div>}
    <Dialog.Root open={resetOpen} onOpenChange={setResetOpen}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="create-dialog logout-dialog"><div className="dialog-heading"><Dialog.Title>Send password reset</Dialog.Title><Dialog.Description>Send a secure reset link to the admin account or any member needing access recovery.</Dialog.Description></div><form onSubmit={submitPasswordReset}><label htmlFor="admin-reset-email">Email address</label><input id="admin-reset-email" type="email" value={resetTarget} onChange={(event) => setResetTarget(event.target.value)} required /><div className="dialog-actions"><Dialog.Close asChild><Button variant="ghost" type="button">Cancel</Button></Dialog.Close><Button type="submit">Send reset link</Button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>
  </section>
}