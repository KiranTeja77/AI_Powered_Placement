import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { TextField, type TextFieldProps } from '@/components/TextField'
import { Button } from '@/components/ui/button'

/** Password input with a show/hide toggle. */
export function PasswordField(props: Omit<TextFieldProps, 'type' | 'adornment'>) {
  const [visible, setVisible] = useState(false)
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      adornment={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff /> : <Eye />}
        </Button>
      }
    />
  )
}
