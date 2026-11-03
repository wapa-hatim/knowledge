import { cva, type VariantProps } from 'class-variance-authority'
import { LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './cn'

const buttonStyles = cva('ui-button', {
  variants: {
    variant: { primary: 'ui-button-primary', secondary: 'ui-button-secondary', ghost: 'ui-button-ghost', outline: 'ui-button-outline' },
    size: { default: 'ui-button-default', small: 'ui-button-small', icon: 'ui-button-icon' },
  },
  defaultVariants: { variant: 'primary', size: 'default' },
})
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles> & { isLoading?: boolean; loadingText?: string; children: ReactNode }
export function Button({ className, variant, size, isLoading = false, loadingText, children, disabled, ...props }: ButtonProps) {
  return <button className={cn(buttonStyles({ variant, size }), isLoading && 'ui-button-loading', className)} disabled={disabled || isLoading} aria-busy={isLoading || undefined} {...props}>
    {isLoading && <LoaderCircle className="ui-button-spinner" size={14} aria-hidden="true" />}
    {isLoading ? loadingText ?? children : children}
  </button>
}