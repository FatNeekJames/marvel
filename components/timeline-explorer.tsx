'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import type { TimelineEntry } from '@/lib/domain/timeline'
import { TimelineCanvas } from '@/components/timeline-canvas'

type Props = { initialEntries: readonly TimelineEntry[]; realities: readonly string[] }

export function TimelineExplorer({ initialEntries, realities }: Props) {
  const [view, setView] = useState<'loom' | 'database'>('loom')
  const [search, setSearch] = useState('')
  const [reality, setReality] = useState('')
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase())
  const entries = useMemo(
    () =>
      initialEntries.filter(
        (entry) =>
          (!reality || entry.reality === reality) &&
          (!deferredSearch ||
            `${entry.title} ${entry.reality} ${entry.note ?? ''}`
              .toLocaleLowerCase()
              .includes(deferredSearch)),
      ),
    [deferredSearch, initialEntries, reality],
  )

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#17152a_0,#05060a_48%)]">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-gold/20 bg-void/85 px-5 py-4 backdrop-blur-xl">
        <div>
          <p className="text-xs tracking-[.35em] text-gold">TVA // TEMPORAL LOOM</p>
          <p className="mt-1 text-xs text-muted">{initialEntries.length} indexed temporal points</p>
        </div>
        <nav className="flex rounded-lg border border-gold/25 p-1" aria-label="Primary view">
          {(['loom', 'database'] as const).map((name) => (
            <button
              key={name}
              onClick={() => setView(name)}
              className={`rounded px-4 py-2 text-xs tracking-widest ${view === name ? 'bg-gold text-black' : 'text-muted hover:text-white'}`}
            >
              {name.toUpperCase()}
            </button>
          ))}
        </nav>
      </header>
      <section className="grid gap-4 p-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-xl border border-gold/20 bg-panel/85 p-4 shadow-2xl">
          <label className="text-xs tracking-widest text-muted" htmlFor="timeline-search">
            SEARCH
          </label>
          <input
            id="timeline-search"
            value={search}
            onChange={(event) => setSearch(event.target.value.slice(0, 120))}
            className="mt-2 w-full rounded-md border border-gold/25 bg-black/30 px-3 py-2 outline-none focus:border-gold"
            placeholder="Title, reality, note"
          />
          <label className="mt-5 block text-xs tracking-widest text-muted" htmlFor="reality">
            REALITY
          </label>
          <select
            id="reality"
            value={reality}
            onChange={(event) => setReality(event.target.value)}
            className="mt-2 w-full rounded-md border border-gold/25 bg-black/30 px-3 py-2"
          >
            <option value="">ALL REALITIES</option>
            {realities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <p className="mt-5 text-xs text-muted">
            <span className="text-gold">{entries.length}</span> matching entries
          </p>
        </aside>
        <div className="min-h-[72vh] overflow-hidden rounded-xl border border-gold/20 bg-black/25">
          {view === 'loom' ? (
            <TimelineCanvas entries={entries} />
          ) : (
            <TimelineTable entries={entries} />
          )}
        </div>
      </section>
    </main>
  )
}

function TimelineTable({ entries }: { entries: readonly TimelineEntry[] }) {
  return (
    <div className="max-h-[78vh] overflow-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-panel text-xs tracking-widest text-gold">
          <tr>
            <th className="p-4">TITLE</th>
            <th className="p-4">REALITY</th>
            <th className="p-4">SEASON / EPISODE</th>
            <th className="p-4">PERIOD</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-t border-gold/10 hover:bg-gold/5">
              <td className="p-4 text-white">{entry.title}</td>
              <td className="p-4 text-muted">
                {entry.reality}
                {entry.note && <span className="block text-xs opacity-70">{entry.note}</span>}
              </td>
              <td className="p-4 text-muted">
                {[entry.season, entry.episodes].filter(Boolean).join(' · ') || '—'}
              </td>
              <td className="p-4 text-gold/80">{entry.period || 'Untemporal'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
