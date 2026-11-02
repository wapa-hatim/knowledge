export type Role = 'Super Admin' | 'Space Admin' | 'Author' | 'Reviewer' | 'Viewer'
export type View = 'overview' | 'library' | 'models' | 'reviews' | 'questions' | 'analytics' | 'spaces' | 'people' | 'settings' | 'audit' | 'search' | 'article' | 'question' | 'help'
export type ArticleStatus = 'Published' | 'Under review' | 'Draft' | 'Archived'
export interface Article { id: string; title: string; summary: string; space: string; category: string; owner: string; updated: string; status: ArticleStatus; views: string; tags: string[]; initials: string; color: string; body?: string; reviewDue?: string; comments?: ArticleComment[]; versions?: ArticleVersion[] }

export interface ArticleComment {
	id: string
	author: string
	body: string
	createdAt: string
}

export interface ArticleVersion {
	id: string
	title: string
	body: string
	status: ArticleStatus
	author: string
	savedAt: string
}

export interface KnowledgeQuestion {
	id: string
	title: string
	body: string
	space: string
	tags: string[]
	author: string
	createdAt: string
	votes: number
	answers: QuestionAnswer[]
	acceptedAnswerId?: string
}

export interface QuestionAnswer {
	id: string
	author: string
	body: string
	votes: number
	verified: boolean
}

export interface WorkspaceUser {
	id: string
	name: string
	email: string
	department: string
	role: Role
	space: string
	status: 'Active' | 'Invited' | 'Suspended'
}

export interface KnowledgeSpace {
	name: string
	description: string
	color: string
	articleCount: number
	owner: string
	categories: string[]
	children?: string[]
}

export interface AuditEvent {
	id: string
	actor: string
	action: string
	target: string
	date: string
	type: 'Content' | 'Access' | 'Workspace'
}

export interface WorkspaceSettings {
	reviewRequired: boolean
	reviewCadenceMonths: 3 | 6 | 12
	notifyOwners: boolean
	allowGuestQuestions: boolean
	defaultArticleVisibility: 'Space members' | 'All workspace members'
}

export interface KnowledgeAsset {
	id: string
	name: string
	kind: 'PDF' | 'DOCX' | 'Spreadsheet' | 'Slides' | 'Image' | 'Video' | 'Diagram' | 'Audio' | 'OpenAPI' | 'Release notes'
	space: string
	size: string
	updated: string
	status: 'Indexed' | 'Processing' | 'Synced'
}

export interface KnowledgeModel {
	id: string
	name: string
	format: 'Article' | 'Playbook' | 'Policy' | 'Runbook' | 'Template' | 'FAQ' | 'Decision record' | 'Architecture design'
	description: string
	owner: string
	audience: string
	useCases: string[]
	coverage: string
	status: 'Managed' | 'Ready for review' | 'Draft'
}

export interface KnowledgeIntegration {
	id: string
	name: string
	description: string
	category: 'Repository' | 'API catalog' | 'Operations'
	connected: boolean
	lastSynced: string
	space?: string
}