import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { BookTemplate, ChevronDown, FileText, Plus, X } from 'lucide-react'
import type { Article } from '../../types'
import { Button } from '../../components/ui/Button'
interface CreateArticleDialogProps { open: boolean; onOpenChange: (open: boolean) => void; onCreate: (article: Article) => void; author: string }

export function CreateArticleDialog({ open, onOpenChange, onCreate, author }: CreateArticleDialogProps) {
  const [title, setTitle] = useState('')
  const [space, setSpace] = useState('Engineering')
  const [template, setTemplate] = useState('Standard article')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!title.trim()) return
    const initials = author.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
    onCreate({ id: `KB-${Date.now().toString().slice(-4)}`, title: title.trim(), summary: 'A new article ready for your ideas.', space, category: template === 'Standard article' ? 'Guides' : template, owner: author, updated: 'Just now', status: 'Draft', views: '—', tags: [], initials, color: 'mint' })
    setTitle('')
  }
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="create-dialog"><div className="dialog-topline"><div className="dialog-icon"><FileText size={19} /></div><Dialog.Close asChild><button className="dialog-close" type="button" aria-label="Close"><X size={17} /></button></Dialog.Close></div><div className="dialog-heading"><Dialog.Title>Start with a blank page.</Dialog.Title><Dialog.Description>Great knowledge starts with a clear title and a place to call home.</Dialog.Description></div><form onSubmit={submit}><label className="form-label" htmlFor="article-title">Article title</label><input id="article-title" className="form-control article-title-input" autoFocus placeholder="Give your article a name" value={title} onChange={(event) => setTitle(event.target.value)} required /><div className="form-row"><div><label className="form-label" htmlFor="article-space">Space</label><div className="select-field"><select id="article-space" value={space} onChange={(event) => setSpace(event.target.value)}><option>Engineering</option><option>Product & Design</option><option>People & Finance</option><option>Customer Success</option><option>Security</option></select><ChevronDown size={14} /></div></div><div><label className="form-label" htmlFor="article-template">Start from</label><div className="select-field"><select id="article-template" value={template} onChange={(event) => setTemplate(event.target.value)}><option>Standard article</option><option>SOP</option><option>FAQ</option><option>Post-mortem</option><option>System spec</option></select><BookTemplate size={14} /></div></div></div><div className="template-note"><BookTemplate size={15} /><span><strong>{template}</strong><small>{template === 'Standard article' ? 'A flexible starting point for anything worth sharing.' : `A guided outline with sections tailored for a ${template.toLowerCase()}.`}</small></span></div><div className="dialog-actions"><Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit"><Plus size={15} />Create draft</Button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>
}