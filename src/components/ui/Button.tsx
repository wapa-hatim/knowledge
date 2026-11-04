import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import { isValidElement, useRef, useState, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { cn } from './cn'

const buttonStyles = cva('ui-button', {
  variants: {
    variant: { primary: 'ui-button-primary', secondary: 'ui-button-secondary', ghost: 'ui-button-ghost', outline: 'ui-button-outline' },
    size: { default: 'ui-button-default', small: 'ui-button-small', icon: 'ui-button-icon' },
  },
  defaultVariants: { variant: 'primary', size: 'default' },
})
type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> & VariantProps<typeof buttonStyles> & {
  isLoading?: boolean
  loadingText?: string
  unstyled?: boolean
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void | Promise<unknown>
  children: ReactNode
}

const actionLoadingLabels: Record<string, string> = {
  add: 'Adding',
  archive: 'Archiving',
  approve: 'Publishing',
  change: 'Saving',
  connect: 'Connecting',
  create: 'Creating',
  delete: 'Deleting',
  invite: 'Inviting',
  publish: 'Publishing',
  remove: 'Removing',
  reset: 'Sending',
  restore: 'Restoring',
  save: 'Saving',
  send: 'Sending',
  submit: 'Submitting',
  upload: 'Uploading',
  vote: 'Saving vote',
}

function buttonText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(buttonText).join(' ')
  if (isValidElement<{ children?: ReactNode }>(node)) return buttonText(node.props.children)
  return ''
}

function defaultLoadingText(children: ReactNode) {
  const action = buttonText(children).trim().split(/\s+/)[0]?.toLowerCase()
  return actionLoadingLabels[action] ? `${actionLoadingLabels[action]}…` : 'Working…'
}

export function Button({ className, variant, size, isLoading = false, loadingText, unstyled = false, children, disabled, onClick, ...props }: ButtonProps) {
  const [clickLoading, setClickLoading] = useState(false)
  const clickPendingRef = useRef(false)
  const busy = isLoading || clickLoading
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (!onClick || clickPendingRef.current) return
    const result = onClick(event)
    if (!result || typeof result.then !== 'function') return
    clickPendingRef.current = true
    setClickLoading(true)
    void Promise.resolve(result).then(() => {
      clickPendingRef.current = false
      setClickLoading(false)
    }, () => {
      clickPendingRef.current = false
      setClickLoading(false)
    })
  }

  return <button className={cn(!unstyled && buttonStyles({ variant, size }), busy && 'ui-button-loading', className)} disabled={disabled || busy} aria-busy={busy || undefined} onClick={handleClick} {...props}>
    {busy && <LoaderCircle className="ui-button-spinner" size={14} aria-hidden="true" />}
    {busy ? loadingText ?? (unstyled ? '' : defaultLoadingText(children)) : children}
  </button>
}