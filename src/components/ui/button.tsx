import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'destructive' | 'outline' | 'ghost' | 'link' | 'success' | 'secondary'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  asChild?: boolean
  children: React.ReactNode
  href?: string
}

const variantClasses: Record<Variant, string> = {
  default:     'bg-primary text-primary-foreground shadow hover:bg-primary/90 active:scale-[0.98]',
  destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
  outline:     'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
  ghost:       'hover:bg-accent hover:text-accent-foreground',
  link:        'text-primary underline-offset-4 hover:underline',
  success:     'bg-emerald-600 text-white shadow hover:bg-emerald-700',
  secondary:   'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
}

const sizeClasses: Record<Size, string> = {
  sm:   'h-8 rounded-md px-3 text-xs',
  md:   'h-10 rounded-lg px-4 py-2 text-sm',
  lg:   'h-12 rounded-lg px-6 text-base',
  icon: 'h-9 w-9 rounded-lg',
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium ' +
  'ring-offset-background transition-all focus-visible:outline-none ' +
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
  'disabled:pointer-events-none disabled:opacity-50'

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'default', size = 'md', loading, disabled, asChild, href, children, ...props },
    ref
  ) => {
    const classes = cn(baseClasses, variantClasses[variant], sizeClasses[size], className)

    // When asChild + href → render a Next.js Link
    if (asChild && href) {
      return (
        <Link href={href} className={cn(classes, (disabled || loading) && 'pointer-events-none opacity-50')}>
          {children}
        </Link>
      )
    }

    // When asChild and children is a Link/anchor
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        className: cn(classes, (children as React.ReactElement<any>).props.className),
      })
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={classes}
        {...props}
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
