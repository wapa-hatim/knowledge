import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ChevronDown, FileUp, X } from 'lucide-react'
import type { KnowledgeAsset, KnowledgeSpace } from '../../types'
import { Button } from '../../components/ui/Button'

interface KnowledgeAssetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (asset: KnowledgeAsset, file: File) => Promise<string | null>
  spaces: KnowledgeSpace[]
  initialSpace?: string | null
}

const assetKinds: KnowledgeAsset['kind'][] = ['PDF', 'DOCX', 'Spreadsheet', 'Slides', 'Image', 'Diagram', 'Video', 'Audio']

function inferKind(fileName: string): KnowledgeAsset['kind'] {
  const extension = fileName.split('.').pop()?.toLowerCase()
  if (extension === 'pdf') return 'PDF'
  if (['doc', 'docx'].includes(extension ?? '')) return 'DOCX'
  if (['xls', 'xlsx', 'csv'].includes(extension ?? '')) return 'Spreadsheet'
  if (['ppt', 'pptx'].includes(extension ?? '')) return 'Slides'
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension ?? '')) return 'Image'
  if (['mp4', 'mov', 'webm'].includes(extension ?? '')) return 'Video'
  if (['mp3', 'wav', 'm4a'].includes(extension ?? '')) return 'Audio'
  return 'Diagram'
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function KnowledgeAssetDialog({ open, onOpenChange, onCreate, spaces, initialSpace }: KnowledgeAssetDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [space, setSpace] = useState(initialSpace ?? 'Engineering')
  const [kind, setKind] = useState<KnowledgeAsset['kind']>('PDF')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFile(null)
      setUploadError('')
    } else {
      setSpace(initialSpace ?? 'Engineering')
      setUploadError('')
    }
    onOpenChange(nextOpen)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) return
    setIsUploading(true)
    setUploadError('')
    try {
      const error = await onCreate({ id: '', name: file.name, kind, space, size: formatSize(file.size), updated: 'Just now', status: 'Processing' }, file)
      if (error) {
        setUploadError(error)
        return
      }
      setFile(null)
    } catch {
      setUploadError('The upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return <Dialog.Root open={open} onOpenChange={handleOpenChange}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="create-dialog">
    <div className="dialog-topline"><div className="dialog-icon"><FileUp size={19} /></div><Dialog.Close asChild><button className="dialog-close" type="button" aria-label="Close"><X size={17} /></button></Dialog.Close></div>
    <div className="dialog-heading"><Dialog.Title>Add a file or media asset</Dialog.Title><Dialog.Description>Make visual and document knowledge discoverable alongside articles.</Dialog.Description></div>
    <form onSubmit={submit}>
      <label className="asset-dropzone"><FileUp size={21} /><strong>{file ? file.name : 'Choose a file to add'}</strong><span>{file ? formatSize(file.size) : 'PDF, DOCX, spreadsheets, slides, images, audio, or video'}</span><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.gif,.mp4,.mov,.webm,.mp3,.wav,.m4a,.svg" onChange={(event) => { const selected = event.target.files?.[0] ?? null; setFile(selected); if (selected) setKind(inferKind(selected.name)) }} required /></label>
      <div className="form-row"><div><label className="form-label" htmlFor="asset-kind">Asset type</label><div className="select-field"><select id="asset-kind" value={kind} onChange={(event) => setKind(event.target.value as KnowledgeAsset['kind'])}>{assetKinds.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></div></div><div><label className="form-label" htmlFor="asset-space">Space</label><div className="select-field"><select id="asset-space" value={space} onChange={(event) => setSpace(event.target.value)}>{spaces.map((item) => <option key={item.name}>{item.name}</option>)}</select><ChevronDown size={14} /></div></div></div>
      <div className="asset-note">Files are uploaded to private Supabase Storage. Only signed-in members of this space can access them.</div>
      {uploadError && <p className="auth-reset-note" role="alert">{uploadError}</p>}
      <div className="dialog-actions"><Button variant="ghost" type="button" onClick={() => handleOpenChange(false)} disabled={isUploading}>Cancel</Button><Button type="submit" isLoading={isUploading} loadingText="Uploading…" disabled={!file}>Upload asset</Button></div>
    </form>
  </Dialog.Content></Dialog.Portal></Dialog.Root>
}