import { useQuery } from '@tanstack/react-query'
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { authApi } from '@/lib/api/auth-api'

/** The department list comes from the API (the same one registration uses). */
export function DepartmentField<T extends FieldValues>({
  control,
  name,
  error,
}: {
  control: Control<T>
  name: Path<T>
  error?: string
}) {
  const departments = useQuery({ queryKey: ['departments'], queryFn: authApi.departments })
  const errorId = `${name}-error`
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name}>Department</Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select value={field.value ?? ''} onValueChange={field.onChange}>
            <SelectTrigger
              id={name}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              disabled={departments.isLoading}
            >
              <SelectValue
                placeholder={departments.isLoading ? 'Loading departments' : 'Select a department'}
              />
            </SelectTrigger>
            <SelectContent>
              {departments.data?.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.code} · {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {departments.isError && (
        <p className="text-sm text-danger">Departments could not be loaded. Reload to try again.</p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
