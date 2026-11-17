import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { TextareaField } from '@/components/TextareaField'
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
import { assignPracticeSchema, type AssignPracticeValues } from '../mentoring/schemas'

export function AssignPracticeDialog({ studentName }: { studentName: string }) {
  const [open, setOpen] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssignPracticeValues>({
    resolver: zodResolver(assignPracticeSchema),
    defaultValues: { topic: '', dueOn: '', note: '' },
  })
  const save = () => {
    notifyUnavailable()
    setOpen(false)
    reset()
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Assign practice</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign practice</DialogTitle>
          <DialogDescription>
            Choose a topic for {studentName} and when it is due.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit(save)} className="grid gap-3">
          <TextField label="Topic" error={errors.topic?.message} {...register('topic')} />
          <TextField
            label="Due date"
            type="date"
            error={errors.dueOn?.message}
            {...register('dueOn')}
          />
          <TextareaField
            label="Note to the student (optional)"
            error={errors.note?.message}
            {...register('note')}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Assign</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
