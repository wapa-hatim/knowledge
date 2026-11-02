import * as Dialog from '@radix-ui/react-dialog'
import { BookOpenText, Boxes, Braces, FileUp, Network, SearchCheck, Sparkles, X } from 'lucide-react'

export type KnowledgeAction = 'article' | 'asset' | 'metadata' | 'question' | 'source' | 'ai-context'

interface AddKnowledgeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (action: KnowledgeAction) => void
}

const options: { action: KnowledgeAction; title: string; description: string; icon: typeof BookOpenText; tone: string }[] = [
  { action: 'article', title: 'Write documentation', description: 'Articles, SOPs, FAQs, runbooks, and decision records.', icon: BookOpenText, tone: 'tone-mint' },
  { action: 'asset', title: 'Upload files & media', description: 'PDFs, office files, images, diagrams, audio, and video.', icon: FileUp, tone: 'tone-blue' },
  { action: 'metadata', title: 'Organize metadata', description: 'Taxonomies, tags, and links between people and services.', icon: Boxes, tone: 'tone-peach' },
  { action: 'question', title: 'Share team knowledge', description: 'Ask a question, discuss answers, and verify solutions.', icon: Sparkles, tone: 'tone-lilac' },
  { action: 'source', title: 'Connect live sources', description: 'Sync API specs, repository releases, and service status.', icon: Braces, tone: 'tone-blue' },
  { action: 'ai-context', title: 'Improve AI discovery', description: 'Review indexed coverage and retrieval context for answers.', icon: SearchCheck, tone: 'tone-mint' },
]

export function AddKnowledgeDialog({ open, onOpenChange, onSelect }: AddKnowledgeDialogProps) {
  const choose = (action: KnowledgeAction) => {
    onOpenChange(false)
    onSelect(action)
  }

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="dialog-overlay" />
      <Dialog.Content className="create-dialog add-knowledge-dialog">
        <div className="dialog-topline"><div className="dialog-icon"><Sparkles size={19} /></div><Dialog.Close asChild><button className="dialog-close" type="button" aria-label="Close"><X size={17} /></button></Dialog.Close></div>
        <div className="dialog-heading"><Dialog.Title>Add knowledge</Dialog.Title><Dialog.Description>Choose the format that best captures what your team knows.</Dialog.Description></div>
        <div className="knowledge-action-grid">
          {options.map(({ action, title, description, icon: Icon, tone }) => <button className="knowledge-action-option" type="button" key={action} onClick={() => choose(action)}>
            <span className={`knowledge-action-icon ${tone}`}><Icon size={17} /></span>
            <span className="knowledge-action-copy"><strong>{title}</strong><small>{description}</small></span>
            <span className="knowledge-action-arrow">→</span>
          </button>)}
        </div>
        <div className="knowledge-action-footnote"><Network size={13} /> Files and external connectors are saved as local demo records; server upload and sync are not configured.</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}