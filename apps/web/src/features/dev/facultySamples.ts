/**
 * Labelled sample content for laying out the proctoring review in the component catalogue.
 * It is imported only by the development catalogue and never by an app route.
 */
import type { ProctorAttempt, ProctorEvent } from '@/lib/api/faculty-types'

export const SAMPLE_ATTEMPTS: ProctorAttempt[] = [
  {
    id: 'a1',
    studentName: 'Sample Student A',
    rollNo: '21CS101',
    assessmentTitle: 'Sample aptitude test',
    eventCount: 5,
    status: 'pending',
  },
  {
    id: 'a2',
    studentName: 'Sample Student B',
    rollNo: '21CS102',
    assessmentTitle: 'Sample aptitude test',
    eventCount: 2,
    status: 'pending',
  },
  {
    id: 'a3',
    studentName: 'Sample Student C',
    rollNo: '21EC103',
    assessmentTitle: 'Sample core CS test',
    eventCount: 1,
    status: 'reviewed',
  },
]

export const SAMPLE_EVENTS: ProctorEvent[] = [
  { id: 'e1', type: 'Left full screen', at: '2026-11-10T10:12:04Z', durationSeconds: 18 },
  { id: 'e2', type: 'Switched to another tab', at: '2026-11-10T10:14:40Z', durationSeconds: 42 },
  { id: 'e3', type: 'Camera disconnected', at: '2026-11-10T10:21:09Z', durationSeconds: 7 },
  { id: 'e4', type: 'Pasted text', at: '2026-11-10T10:30:51Z', durationSeconds: null },
  { id: 'e5', type: 'Left full screen', at: '2026-11-10T10:41:30Z', durationSeconds: 11 },
]
