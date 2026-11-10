import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-base font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary: 'border border-border bg-surface text-text hover:bg-surface-muted',
        ghost: 'text-text hover:bg-surface-muted',
        danger: 'bg-danger text-primary-foreground hover:opacity-90',
        link: 'h-auto p-0 text-primary hover:underline',
      },
      size: {
        default: 'h-9 px-3',
        sm: 'h-8 px-2.5 text-sm',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
)
