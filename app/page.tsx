import { TimelineExplorer } from '@/components/timeline-explorer'
import { getTimelineRepository } from '@/lib/repositories'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  let data: Awaited<ReturnType<typeof loadTimeline>> | null = null
  try {
    data = await loadTimeline()
  } catch (error) {
    console.error('Timeline query failed', error)
  }
  if (!data)
    return (
      <div id="errBox">
        DATABASE UNAVAILABLE
        {'\n'}
        Configure DATABASE_URL, run the database migration, and seed the timeline data.
      </div>
    )
  return <TimelineExplorer datasets={data} />
}

async function loadTimeline() {
  const timelineRepository = getTimelineRepository()
  const [main, nineties, tens, universeKeys] = await Promise.all([
    timelineRepository.find({ dataset: 'main' }),
    timelineRepository.find({ dataset: '90s' }),
    timelineRepository.find({ dataset: '2010s' }),
    timelineRepository.find({ dataset: 'universe-keys' }),
  ])
  return { main, nineties, tens, universeKeys }
}
