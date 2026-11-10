import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useTheme } from '@/lib/theme/theme-context'

export function Toaster(props: ToasterProps) {
  const { resolved } = useTheme()
  return (
    <Sonner
      theme={resolved}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            '!rounded-md !border !border-border !bg-surface !text-text !shadow-popover !text-base',
          description: '!text-text-muted',
        },
      }}
      {...props}
    />
  )
}
