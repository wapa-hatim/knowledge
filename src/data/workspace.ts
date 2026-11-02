import type { AuditEvent, KnowledgeQuestion, KnowledgeSpace, WorkspaceUser } from '../types'

export const initialQuestions: KnowledgeQuestion[] = [
  { id: 'Q-208', title: 'What is the process for requesting production access?', body: 'I need temporary access to investigate a production issue. What approvals and steps are required?', space: 'Engineering', tags: ['access', 'production'], author: 'Jordan Lee', createdAt: '18 minutes ago', votes: 18, answers: [{ id: 'A-208-1', author: 'Maya Chen', body: 'Start with the access request form linked in the Security space. Include the incident or ticket, requested scope, and an expiry time. Your manager and the service owner both need to approve.', votes: 12, verified: true }, { id: 'A-208-2', author: 'Theo Martin', body: 'For active incidents, the on-call lead can grant break-glass access. Make sure the access is recorded in the incident timeline and expires when triage is complete.', votes: 6, verified: false }], acceptedAnswerId: 'A-208-1' },
  { id: 'Q-207', title: 'How do I submit an expense from a previous month?', body: 'I missed the normal submission window. Is there a way to file an expense retroactively?', space: 'People & Finance', tags: ['expenses', 'finance'], author: 'Amina Yusuf', createdAt: 'Yesterday', votes: 11, answers: [{ id: 'A-207-1', author: 'Priya Nair', body: 'Submit it in the expenses portal and select “late submission”. Add a brief note explaining the delay. Finance reviews exceptions each Friday.', votes: 8, verified: true }], acceptedAnswerId: 'A-207-1' },
  { id: 'Q-206', title: 'Which customer environments support SSO?', body: 'I am preparing an implementation plan and need to know which environments support SAML or OIDC.', space: 'Customer Success', tags: ['sso', 'customer'], author: 'Jordan Lee', createdAt: '2 days ago', votes: 7, answers: [] },
]

export const initialSpaces: KnowledgeSpace[] = [
  { name: 'Engineering', description: 'Build, ship, and operate our products.', color: 'green', articleCount: 86, owner: 'Maya Chen', categories: ['Onboarding', 'Runbooks', 'Architecture', 'SOPs'], children: ['Platform', 'Product Engineering', 'Security'] },
  { name: 'Product & Design', description: 'Research, product direction, and design systems.', color: 'orange', articleCount: 54, owner: 'Theo Martin', categories: ['Product specs', 'Research', 'Guides', 'Design system'] },
  { name: 'People & Finance', description: 'The policies and practices that support our team.', color: 'blue', articleCount: 43, owner: 'Priya Nair', categories: ['Policies', 'Benefits', 'Expenses', 'Onboarding'] },
  { name: 'Customer Success', description: 'Help customers get lasting value from our work.', color: 'pink', articleCount: 38, owner: 'Jordan Lee', categories: ['Playbooks', 'FAQs', 'Handoffs', 'Troubleshooting'] },
  { name: 'Security', description: 'Security practices, controls, and compliance.', color: 'purple', articleCount: 27, owner: 'Priya Nair', categories: ['SOPs', 'Access', 'Compliance', 'Incident response'] },
]

export const initialUsers: WorkspaceUser[] = [
  { id: 'U-001', name: 'Amina Yusuf', email: 'amina@northstar.studio', department: 'Operations', role: 'Super Admin', space: 'All spaces', status: 'Active' },
  { id: 'U-002', name: 'Maya Chen', email: 'maya@northstar.studio', department: 'Engineering', role: 'Space Admin', space: 'Engineering', status: 'Active' },
  { id: 'U-003', name: 'Theo Martin', email: 'theo@northstar.studio', department: 'Product', role: 'Author', space: 'Product & Design', status: 'Active' },
  { id: 'U-004', name: 'Priya Nair', email: 'priya@northstar.studio', department: 'Security', role: 'Reviewer', space: 'Security', status: 'Active' },
  { id: 'U-005', name: 'Jordan Lee', email: 'jordan@northstar.studio', department: 'Customer Success', role: 'Viewer', space: 'Customer Success', status: 'Invited' },
]

export const initialAuditEvents: AuditEvent[] = [
  { id: 'EV-8492', actor: 'Maya Chen', action: 'Published article', target: 'Engineering onboarding handbook', date: 'Today, 9:42 AM', type: 'Content' },
  { id: 'EV-8491', actor: 'Amina Yusuf', action: 'Changed role', target: 'Jordan Lee · Viewer', date: 'Today, 9:18 AM', type: 'Access' },
  { id: 'EV-8490', actor: 'Priya Nair', action: 'Requested review', target: 'Quarterly access review SOP', date: 'Yesterday, 4:32 PM', type: 'Content' },
  { id: 'EV-8489', actor: 'Amina Yusuf', action: 'Invited member', target: 'Jordan Lee', date: 'Yesterday, 3:10 PM', type: 'Access' },
]