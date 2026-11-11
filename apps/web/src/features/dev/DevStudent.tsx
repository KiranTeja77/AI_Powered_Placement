import { useState } from 'react'
import { toast } from 'sonner'
import { DriveDetailView } from '@/features/student/drives/DriveDetailView'
import { TestPlayer } from '@/features/student/assessments/TestPlayer'
import { FullscreenWarning } from '@/features/student/assessments/MonitoringBanner'
import { ResultView } from '@/features/student/results/ResultView'
import { RoadmapView } from '@/features/student/roadmap/RoadmapView'
import type { WeeklyTask } from '@/lib/api/student-types'
import { DevSection } from './DevSection'
import { SAMPLE_DRIVE, SAMPLE_QUESTIONS, SAMPLE_RESULT, SAMPLE_TASKS } from './studentSamples'

function SampleNote() {
  return (
    <p className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-text">
      Sample data for layout only. It is not shown anywhere in the app.
    </p>
  )
}

/** Student screens that need content to show their layout. Everything here is labelled sample data. */
export function DevStudent() {
  const [tasks, setTasks] = useState<WeeklyTask[]>(SAMPLE_TASKS)
  return (
    <>
      <DevSection id="dev-test-player" title="Test player (sample)">
        <SampleNote />
        <div className="rounded-md border border-border p-3">
          <TestPlayer
            title="Sample aptitude and core CS test"
            durationSeconds={30 * 60}
            questions={SAMPLE_QUESTIONS}
            onSubmit={() => toast("Saving isn't available yet")}
          />
        </div>
        <p className="text-sm text-text-muted">Full-screen exit warning, shown on its own:</p>
        <FullscreenWarning onReturn={() => undefined} />
      </DevSection>

      <DevSection id="dev-result" title="Result page (sample)">
        <SampleNote />
        <div className="rounded-md border border-border p-3">
          <ResultView result={SAMPLE_RESULT} />
        </div>
      </DevSection>

      <DevSection id="dev-roadmap" title="Roadmap (sample)">
        <SampleNote />
        <RoadmapView
          tasks={tasks}
          onToggle={(task, done) =>
            setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done } : t)))
          }
        />
      </DevSection>

      <DevSection id="dev-drive" title="Drive detail (sample)">
        <SampleNote />
        <div className="rounded-md border border-border p-3">
          <DriveDetailView drive={SAMPLE_DRIVE} />
        </div>
      </DevSection>
    </>
  )
}
