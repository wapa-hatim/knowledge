import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Activity, Braces, ChevronDown, GitBranch, X } from 'lucide-react'
import type { KnowledgeIntegration } from '../../types'
import { Button } from '../../components/ui/Button'

interface KnowledgeSourceDialogProps { open: boolean; onOpenChange: (open: boolean) => void; onCreate: (integration: KnowledgeIntegration) => void; initialSpace?: string | null }
const sourceOptions = [
  { name: 'GitHub releases', category: 'Repository' as const, description: 'Release notes and changelog entries from a repository.', icon: GitBranch },
  { name: 'OpenAPI catalog', category: 'API catalog' as const, description: 'API specifications and endpoint references.', icon: Braces },
  { name: 'Service status feed', category: 'Operations' as const, description: 'Operational status updates and service health notes.', icon: Activity },
]

export function KnowledgeSourceDialog({ open, onOpenChange, onCreate, initialSpace }: KnowledgeSourceDialogProps) {
  const [sourceName, setSourceName] = useState(sourceOptions[0].name)
  const space = initialSpace ?? 'Engineering'
  const selectedSource = sourceOptions.find((source) => source.name === sourceName) ?? sourceOptions[0]
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onCreate({ id: `INT-${Date.now()}`, name: selectedSource.name, description: selectedSource.description, category: selectedSource.category, connected: false, lastSynced: 'Not connected', space })
  }

  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="create-dialog">
    <div className="dialog-topline"><div className="dialog-icon"><Braces size={19} /></div><Dialog.Close asChild><button className="dialog-close" type="button" aria-label="Close"><X size={17} /></button></Dialog.Close></div>
    <div className="dialog-heading"><Dialog.Title>Connect a knowledge source</Dialog.Title><Dialog.Description>Bring changing system knowledge into the same discovery experience.</Dialog.Description></div>
    <form onSubmit={submit}><label className="form-label" htmlFor="source-type">Source type</label><div className="select-field"><select id="source-type" value={sourceName} onChange={(event) => setSourceName(event.target.value)}>{sourceOptions.map((source) => <option key={source.name}>{source.name}</option>)}</select><ChevronDown size={14} /></div>
      <div className="source-preview"><selectedSource.icon size={17} /><span><strong>{selectedSource.name}</strong><small>{selectedSource.description}{initialSpace ? ` Added to ${initialSpace}.` : ''}</small></span></div>
      <div className="asset-note">This saves a source record in Supabase. Credentials, scheduled sync, and source indexing require server-side configuration.</div>
      <div className="dialog-actions"><Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit">Add source</Button></div>
    </form>
  </Dialog.Content></Dialog.Portal></Dialog.Root>
}