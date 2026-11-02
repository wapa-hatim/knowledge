import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Code2, Heading2, ImagePlus, Italic, List, ListOrdered, Save, Table2 } from 'lucide-react'

interface ArticleEditorProps {
  articleId: string
  initialBody: string
  onAutosave: (body: string) => void
  onSaveVersion: (body: string) => void
  onCancel: () => void
  onSubmitReview: () => void
}

export function ArticleEditor({ articleId, initialBody, onAutosave, onSaveVersion, onCancel, onSubmitReview }: ArticleEditorProps) {
  const [sourceMode, setSourceMode] = useState(false)
  const [source, setSource] = useState(initialBody)
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editor = useEditor({
    extensions: [StarterKit, Markdown, Image, Table.configure({ resizable: true }), TableRow, TableHeader, TableCell, Placeholder.configure({ placeholder: 'Start writing. Use / for blocks, or the toolbar for formatting.' })],
    content: initialBody,
    contentType: 'markdown',
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      setSaveState('saving')
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        onAutosave(currentEditor.getMarkdown())
        setSaveState('saved')
      }, 650)
    },
  }, [articleId])

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
  }, [])

  const toggleSource = () => {
    if (!editor) return
    if (!sourceMode) {
      setSource(editor.getMarkdown())
      setSourceMode(true)
      return
    }
    editor.commands.setContent(source, { contentType: 'markdown' })
    setSourceMode(false)
  }

  const addImage = (file?: File) => {
    if (!file || !editor) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') editor.chain().focus().setImage({ src: reader.result, alt: file.name }).run()
    }
    reader.readAsDataURL(file)
  }

  const saveVersion = () => {
    const body = sourceMode ? source : editor?.getMarkdown() ?? initialBody
    onAutosave(body)
    onSaveVersion(body)
    setSaveState('saved')
  }

  return <section className="editor-workspace">
    <div className="editor-toolbar">
      <div className="editor-format-tools" aria-label="Text formatting">
        <button type="button" title="Bold" aria-label="Bold" disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold size={16} /></button>
        <button type="button" title="Italic" aria-label="Italic" disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic size={16} /></button>
        <span />
        <button type="button" title="Heading" aria-label="Heading" disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></button>
        <button type="button" title="Bulleted list" aria-label="Bulleted list" disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List size={16} /></button>
        <button type="button" title="Numbered list" aria-label="Numbered list" disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></button>
        <button type="button" title="Code block" aria-label="Code block" disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().toggleCodeBlock().run()}><Code2 size={16} /></button>
        <button type="button" title="Insert table" aria-label="Insert table" disabled={!editor || sourceMode} onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><Table2 size={16} /></button>
        <label className="editor-image-button" title="Insert image" aria-label="Insert image"><ImagePlus size={16} /><input type="file" accept="image/*" onChange={(event) => addImage(event.target.files?.[0])} /></label>
      </div>
      <div className="editor-toolbar-actions"><span className="autosave-state"><i className={saveState === 'saving' ? 'is-saving' : ''} />{saveState === 'saving' ? 'Saving…' : 'Saved locally'}</span><button type="button" className={`editor-mode-button${sourceMode ? ' selected' : ''}`} onClick={toggleSource}>Markdown</button><button type="button" className={`editor-mode-button${!sourceMode ? ' selected' : ''}`} onClick={toggleSource}>Visual</button></div>
    </div>
    {sourceMode ? <textarea className="markdown-source" aria-label="Markdown source" value={source} onChange={(event) => { setSource(event.target.value); setSaveState('saving'); if (saveTimer.current) clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => { onAutosave(event.target.value); setSaveState('saved') }, 650) }} /> : <EditorContent editor={editor} className="tiptap-content" />}
    <div className="editor-footer"><span>Changes are saved in this browser.</span><div><button className="ui-button ui-button-ghost ui-button-default" type="button" onClick={onCancel}>Cancel</button><button className="ui-button ui-button-outline ui-button-default" type="button" onClick={saveVersion}><Save size={14} />Save version</button><button className="ui-button ui-button-primary ui-button-default" type="button" onClick={onSubmitReview}>Submit for review</button></div></div>
  </section>
}