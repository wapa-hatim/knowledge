export type Role = 'Super Admin' | 'Space Admin' | 'Author' | 'Reviewer' | 'Viewer'
export type View = 'overview' | 'library' | 'reviews' | 'questions' | 'analytics'
export type ArticleStatus = 'Published' | 'Under review' | 'Draft' | 'Archived'
export interface Article { id: string; title: string; summary: string; space: string; category: string; owner: string; updated: string; status: ArticleStatus; views: string; tags: string[]; initials: string; color: string }