import { PageHeader } from '@/components/PageHeader'
import { useTrainingTrack } from '@/lib/api/pending'
import { TrackView } from './TrackView'

const COPY = {
  technical: {
    title: 'Technical training',
    description: 'Programming, core subjects and tools, grouped by department.',
  },
  'non-technical': {
    title: 'Non-technical training',
    description: 'Aptitude, communication and interview preparation, grouped by area.',
  },
} as const

export default function TrackPage({ kind }: { kind: keyof typeof COPY }) {
  const track = useTrainingTrack(kind)
  const { title, description } = COPY[kind]
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Home', to: '/s' }, { label: title }]}
        title={title}
        description={description}
      />
      <TrackView
        groups={track.data}
        kind={kind}
        loading={track.isLoading}
        error={track.isError}
        onRetry={track.refetch}
      />
    </>
  )
}
