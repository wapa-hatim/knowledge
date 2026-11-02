import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { BookTemplate, ChevronDown, FileText, Plus, X } from 'lucide-react'
import type { Article, KnowledgeSpace } from '../../types'
import { Button } from '../../components/ui/Button'

interface CreateArticleDialogProps { open: boolean; onOpenChange: (open: boolean) => void; onCreate: (article: Article) => Promise<string | null>; author: string; spaces: KnowledgeSpace[]; initialSpace?: string }

export function CreateArticleDialog({ open, onOpenChange, onCreate, author, spaces, initialSpace = '' }: CreateArticleDialogProps) {
  const [title, setTitle] = useState('')
  const [space, setSpace] = useState(initialSpace)
  const [template, setTemplate] = useState('Standard article')
  const [error, setError] = useState('')

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSpace(initialSpace)
    } else {
      setTitle('')
      setTemplate('Standard article')
      setSpace(initialSpace)
    }
    onOpenChange(nextOpen)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim() || !space) return
    const initials = author.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    setError('')
    const result = await onCreate({ id: crypto.randomUUID(), title: title.trim(), summary: '', space, category: template === 'Standard article' ? 'Guides' : template, owner: author, updated: 'Just now', status: 'Draft', views: '0', tags: [], initials, color: 'mint', body: '' })
    if (result) {
      setError(result)
      return
    }
    setTitle('')
  }
  return <Dialog.Root open={open} onOpenChange={handleOpenChange}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="create-dialog"><div className="dialog-topline"><div className="dialog-icon"><FileText size={19} /></div><Dialog.Close asChild><button className="dialog-close" type="button" aria-label="Close"><X size={17} /></button></Dialog.Close></div><div className="dialog-heading"><Dialog.Title>Start with a blank page.</Dialog.Title><Dialog.Description>Great knowledge starts with a clear title and a place to call home.</Dialog.Description></div><form onSubmit={submit}><label className="form-label" htmlFor="article-title">Article title</label><input id="article-title" className="form-control article-title-input" autoFocus placeholder="Give your article a name" value={title} onChange={(event) => setTitle(event.target.value)} required /><div className="form-row"><div><label className="form-label" htmlFor="article-space">Space</label><div className="select-field"><select id="article-space" value={space} onChange={(event) => setSpace(event.target.value)} required><option value="" disabled>Select a space</option>{spaces.map((item) => <option key={item.name}>{item.name}</option>)}</select><ChevronDown size={14} /></div></div><div><label className="form-label" htmlFor="article-template">Start from</label><div className="select-field"><select id="article-template" value={template} onChange={(event) => setTemplate(event.target.value)}><option>Standard article</option><option>SOP</option><option>FAQ</option><option>Post-mortem</option><option>System spec</option></select><BookTemplate size={14} /></div></div></div><div className="template-note"><BookTemplate size={15} /><span><strong>{template}</strong><small>{template === 'Standard article' ? 'A flexible starting point for anything worth sharing.' : `A guided outline with sections tailored for a ${template.toLowerCase()}.`}</small></span></div>{error && <span className="auth-reset-note" role="alert">{error}</span>}<div className="dialog-actions"><Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={!spaces.length}><Plus size={15} />Create draft</Button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>
}