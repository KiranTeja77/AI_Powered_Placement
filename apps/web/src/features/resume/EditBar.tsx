import { Button } from '@/components/ui/button'

interface EditBarProps {
  dirty: boolean
  hasSavedEdits: boolean
  saving: boolean
  error: string | null
  onSave: () => void
  onDiscard: () => void
  onReset: () => void
}

/** Save, discard or reset the skill edits. Stays at the bottom of the screen while there is work. */
export function EditBar({
  dirty,
  hasSavedEdits,
  saving,
  error,
  onSave,
  onDiscard,
  onReset,
}: EditBarProps) {
  if (!dirty && !hasSavedEdits && !error) return null
  return (
    <div className="sticky bottom-0 -mx-4 border-t border-border bg-surface px-4 py-3 sm:-mx-6 sm:px-6">
      <div className="flex max-w-4xl flex-wrap items-center gap-3">
        {error && (
          <p role="alert" className="w-full text-base text-danger">
            {error}
          </p>
        )}
        {dirty ? (
          <>
            <p className="text-base text-text">You have unsaved changes to the skill list.</p>
            <div className="ml-auto flex gap-2">
              <Button variant="secondary" onClick={onDiscard} disabled={saving}>
                Discard changes
              </Button>
              <Button onClick={onSave} disabled={saving}>
                {saving ? 'Saving' : 'Save changes'}
              </Button>
            </div>
          </>
        ) : (
          hasSavedEdits && (
            <>
              <p className="text-base text-text-muted">
                The scores above include your saved changes.
              </p>
              <Button variant="secondary" className="ml-auto" onClick={onReset} disabled={saving}>
                {saving ? 'Resetting' : 'Reset to analyzer result'}
              </Button>
            </>
          )
        )}
      </div>
    </div>
  )
}
