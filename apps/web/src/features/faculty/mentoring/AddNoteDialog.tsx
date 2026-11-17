import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
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
import { noteSchema, type NoteValues } from './schemas'

/** A full, validated form for a mentoring note. Saving is not available yet, and it says so. */
export function AddNoteDialog({ rollNo }: { rollNo?: string }) {
  const [open, setOpen] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NoteValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { studentRollNo: rollNo ?? '', note: '', assignedPractice: '', followUpOn: '' },
  })

  const save = () => {
    notifyUnavailable()
    setOpen(false)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Add note
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a mentoring note</DialogTitle>
          <DialogDescription>
            Notes are visible to you and the placement team, not to the student.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit(save)} className="grid gap-3">
          <TextField
            label="Student roll number"
            className="font-mono"
            readOnly={Boolean(rollNo)}
            error={errors.studentRollNo?.message}
            {...register('studentRollNo')}
          />
          <TextareaField label="Note" error={errors.note?.message} {...register('note')} />
          <TextField
            label="Assigned practice (optional)"
            hint="For example: 10 SQL join questions"
            error={errors.assignedPractice?.message}
            {...register('assignedPractice')}
          />
          <TextField
            label="Follow-up date (optional)"
            type="date"
            error={errors.followUpOn?.message}
            {...register('followUpOn')}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Save note</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
