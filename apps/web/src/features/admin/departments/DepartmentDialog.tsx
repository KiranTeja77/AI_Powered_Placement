import { zodResolver } from '@hookform/resolvers/zod'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { TextField } from '@/components/TextField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { notifyUnavailable } from '@/lib/notify'
import { departmentSchema, type DepartmentValues } from './schemas'

interface DepartmentDialogProps {
  trigger: ReactNode
  /** Present when editing. */
  initial?: DepartmentValues
}

/** Add or edit a department. The form is complete and checked; saving is not available yet. */
export function DepartmentDialog({ trigger, initial }: DepartmentDialogProps) {
  const [open, setOpen] = useState(false)
  const editing = Boolean(initial)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DepartmentValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: initial ?? { code: '', name: '' },
  })
  const save = () => {
    notifyUnavailable()
    setOpen(false)
    reset(initial ?? { code: '', name: '' })
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit department' : 'Add a department'}</DialogTitle>
          <DialogDescription>
            The code is short and unique. The name is shown in full on forms and reports.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit(save)} className="grid gap-3">
          <TextField
            label="Code"
            className="font-mono uppercase"
            error={errors.code?.message}
            {...register('code')}
          />
          <TextField label="Name" error={errors.name?.message} {...register('name')} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">{editing ? 'Save changes' : 'Add department'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
