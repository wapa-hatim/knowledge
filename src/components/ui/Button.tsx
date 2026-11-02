import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

const buttonStyles = cva('ui-button', {
  variants: {
    variant: { primary: 'ui-button-primary', secondary: 'ui-button-secondary', ghost: 'ui-button-ghost', outline: 'ui-button-outline' },
    size: { default: 'ui-button-default', small: 'ui-button-small', icon: 'ui-button-icon' },
  },
  defaultVariants: { variant: 'primary', size: 'default' },
})
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonStyles>
export function Button({ className, variant, size, ...props }: ButtonProps) { return <button className={cn(buttonStyles({ variant, size }), className)} {...props} /> }