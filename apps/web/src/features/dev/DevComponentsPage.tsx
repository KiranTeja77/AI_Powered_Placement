import { Monitor, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/lib/theme/theme-context'
import { DevComposites } from './DevComposites'
import { DevControls } from './DevControls'
import { DevOverlays } from './DevOverlays'

/** Development-only catalogue of every component and state. Not linked from the app. */
export default function DevComponentsPage() {
  const { preference, setPreference } = useTheme()
  return (
    <main className="max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-text">Component catalogue</h1>
          <p className="mt-1 text-base text-text-muted">
            Development only. Sample content here is for layout and never appears in app routes.
          </p>
        </div>
        <div role="group" aria-label="Theme" className="flex gap-1">
          {(
            [
              ['light', Sun, 'Light'],
              ['dark', Moon, 'Dark'],
              ['system', Monitor, 'System'],
            ] as const
          ).map(([value, Icon, label]) => (
            <Button
              key={value}
              size="sm"
              variant={preference === value ? 'primary' : 'secondary'}
              aria-pressed={preference === value}
              onClick={() => setPreference(value)}
            >
              <Icon /> {label}
            </Button>
          ))}
        </div>
      </div>
      <DevControls />
      <DevOverlays />
      <DevComposites />
    </main>
  )
}
