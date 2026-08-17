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
      <main className="grid min-h-screen place-items-center p-6">
        <section className="max-w-xl rounded-xl border border-red-400/30 bg-panel p-8 shadow-2xl">
          <p className="mb-2 text-xs tracking-[.3em] text-red-300">DATABASE UNAVAILABLE</p>
          <h1 className="text-2xl text-white">Temporal Loom could not initialize</h1>
          <p className="mt-4 text-sm leading-6 text-muted">
            Configure <code className="text-gold">DATABASE_URL</code>, run the database migration,
            and seed the timeline data. The application intentionally does not fall back to browser
            storage.
          </p>
        </section>
      </main>
    )
  return <TimelineExplorer initialEntries={data.entries} realities={data.realities} />
}

async function loadTimeline() {
  const timelineRepository = getTimelineRepository()
  const [entries, realities] = await Promise.all([
    timelineRepository.find(),
    timelineRepository.realities(),
  ])
  return { entries, realities }
}
