'use client'

import { useMemo, useState } from 'react'
import type { LoomPoint } from '@/lib/loom/points'
import { DATASET_TABS, DEFAULT_RELEASE_QUEUE, type ReleaseQueueItem } from '@/lib/loom/queue'
import { earthColor } from '@/lib/loom/colors'

type SortKey = 'case' | 'watched' | 'title' | 'base' | 'season' | 'episodes' | 'year'

type Props = {
  datasets: Record<string, readonly LoomPoint[]>
  onOpenInLoom: (id: string) => void
}

function blank(value: string | null) {
  return !value || value === 'N/A' ? '—' : value
}

function caseNumber(index: number) {
  return `CASE #${String(index + 1).padStart(4, '0')}`
}

export function DatabaseView({ datasets, onOpenInLoom }: Props) {
  const [dataset, setDataset] = useState<string>('main')
  const [search, setSearch] = useState('')
  const [reality, setReality] = useState('')
  const [watchedOnly, setWatchedOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('case')
  const [sortDir, setSortDir] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [watched, setWatched] = useState<Record<string, boolean>>({})
  const [queueGone, setQueueGone] = useState<Record<string, boolean>>({})
  const [queueDone, setQueueDone] = useState<Record<string, boolean>>({})
  const [customQueue, setCustomQueue] = useState<ReleaseQueueItem[]>([])
  const [queueDraft, setQueueDraft] = useState('')
  const [queueCollapsed, setQueueCollapsed] = useState(false)
  const [printState, setPrintState] = useState('PRINT')
  const [archiveState, setArchiveState] = useState('ARCHIVE')

  const entries = useMemo(() => datasets[dataset] ?? [], [dataset, datasets])
  const haystack = useMemo(
    () =>
      Object.values(datasets).flatMap((list) =>
        list.map((entry) => entry.title.toLocaleLowerCase()),
      ),
    [datasets],
  )
  const realities = useMemo(() => {
    const counts = new Map<string, number>()
    for (const entry of entries) counts.set(entry.reality, (counts.get(entry.reality) ?? 0) + 1)
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [entries])

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase()
    const list = entries.filter((entry) => {
      if (watchedOnly && !watched[entry.id]) return false
      if (reality && entry.reality !== reality) return false
      if (
        q &&
        !`${entry.title} ${entry.universe} ${entry.note ?? ''} ${entry.reality}`
          .toLocaleLowerCase()
          .includes(q)
      )
        return false
      return true
    })
    const value = (entry: LoomPoint) => {
      switch (sortKey) {
        case 'case':
          return entry.index
        case 'title':
          return entry.title.toLocaleLowerCase()
        case 'base':
          return entry.reality.toLocaleLowerCase()
        case 'season':
          return (entry.season === 'N/A' ? '' : (entry.season ?? '')).toLocaleLowerCase()
        case 'episodes':
          return (entry.episodes === 'N/A' ? '' : (entry.episodes ?? '')).toLocaleLowerCase()
        case 'year':
          return entry.yearMin ?? Infinity
        case 'watched':
          return watched[entry.id] ? 1 : 0
      }
    }
    return [...list].sort((a, b) => {
      const va = value(a)
      const vb = value(b)
      if (va === vb) return a.title.localeCompare(b.title)
      return va < vb ? -sortDir : sortDir
    })
  }, [entries, reality, search, sortDir, sortKey, watched, watchedOnly])

  const watchedCount = entries.filter((entry) => watched[entry.id]).length
  const selected = entries.find((entry) => entry.id === selectedId) ?? null
  const queueItems = [...DEFAULT_RELEASE_QUEUE, ...customQueue].filter((item) => {
    if (queueGone[item.key]) return false
    if (item.match && haystack.some((title) => title.includes(item.match))) return false
    return true
  })
  const queueDoneCount = queueItems.filter((item) => queueDone[item.key]).length

  const sort = (key: SortKey) => {
    if (sortKey === key) setSortDir((dir) => dir * -1)
    else {
      setSortKey(key)
      setSortDir(1)
    }
  }
  const arrow = (key: SortKey) =>
    sortKey === key ? <span className="sort-arrow">{sortDir === 1 ? '▲' : '▼'}</span> : null

  return (
    <section id="db" className="on" aria-label="Temporal entry database">
      <div className="db-head">
        <span className="db-title">TVA // TEMPORAL ENTRY DATABASE</span>
        <span className="db-sub">
          {filtered.length} / {entries.length} ENTRIES
          {watchedCount ? ` · ${watchedCount} WATCHED` : ''}
        </span>
        <div className="db-sets">
          {DATASET_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`btn${dataset === tab.key ? ' act' : ''}`}
              onClick={() => {
                setDataset(tab.key)
                setSearch('')
                setReality('')
                setWatchedOnly(false)
                setSortKey('case')
                setSortDir(1)
                setSelectedId(null)
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          className={`btn${printState === 'QUEUED' ? ' act' : ''}`}
          onClick={() => setPrintState('QUEUED')}
        >
          {printState}
        </button>
        <button
          className={`btn${archiveState === 'ARCHIVED' ? ' act' : ''}`}
          onClick={() => setArchiveState('ARCHIVED')}
        >
          {archiveState}
        </button>
      </div>
      <div className="db-bar">
        <input
          id="dbSearch"
          value={search}
          onChange={(event) => setSearch(event.target.value.slice(0, 120))}
          placeholder="SEARCH: TITLE, REALITY, NOTE..."
          aria-label="Search entries"
        />
        <select
          id="dbEarth"
          value={reality}
          onChange={(event) => setReality(event.target.value)}
          aria-label="Filter by reality"
        >
          <option value="">ALL REALITIES</option>
          {realities.map(([name, count]) => (
            <option key={name} value={name}>
              {name || 'UNKNOWN'} ({count})
            </option>
          ))}
        </select>
        <button
          className="btn"
          onClick={() => {
            setSearch('')
            setReality('')
            setWatchedOnly(false)
          }}
        >
          RESET
        </button>
        <button
          className={`btn${watchedOnly ? ' act' : ''}`}
          onClick={() => setWatchedOnly((value) => !value)}
        >
          {watchedOnly ? 'ALL ENTRIES' : 'WATCHED ONLY'}
        </button>
      </div>
      <div id="dbProg">
        <span
          id="dbProgFill"
          style={{
            width: `${entries.length ? Math.round((watchedCount / entries.length) * 100) : 0}%`,
          }}
        />
      </div>
      <div className="db-wrap">
        <table id="dbTable">
          <thead>
            <tr>
              <th onClick={() => sort('case')}>CASE#{arrow('case')}</th>
              <th onClick={() => sort('watched')}>WATCH{arrow('watched')}</th>
              <th onClick={() => sort('title')}>TITLE{arrow('title')}</th>
              <th onClick={() => sort('base')}>REALITY{arrow('base')}</th>
              <th onClick={() => sort('season')}>SEASON{arrow('season')}</th>
              <th onClick={() => sort('episodes')}>EPISODES{arrow('episodes')}</th>
              <th onClick={() => sort('year')}>TIME PERIOD{arrow('year')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => {
              const isWatched = !!watched[entry.id]
              const color = entry.color || earthColor(entry.reality)
              return (
                <tr
                  key={entry.id}
                  className={`${isWatched ? 'w' : ''} ${selectedId === entry.id ? 'sel' : ''}`.trim()}
                  onClick={() => setSelectedId(entry.id)}
                  onDoubleClick={() => {
                    if (entry.loom) onOpenInLoom(entry.id)
                  }}
                >
                  <td className="c-case">{caseNumber(entry.index)}</td>
                  <td className="c-w">
                    <button
                      className={`chk${isWatched ? ' on' : ''}`}
                      title="CHECK TO MARK WATCHED"
                      aria-label={isWatched ? 'Mark unwatched' : 'Mark watched'}
                      onClick={(event) => {
                        event.stopPropagation()
                        setWatched((current) => ({ ...current, [entry.id]: !current[entry.id] }))
                      }}
                    >
                      {isWatched ? '✓' : ''}
                    </button>
                  </td>
                  <td className="c-title">{entry.title}</td>
                  <td>
                    <span className="dot" style={{ background: color, color }} />
                    {entry.reality || 'UNKNOWN'}
                    {entry.note ? <span className="nb"> {entry.note}</span> : null}
                  </td>
                  <td>{blank(entry.season)}</td>
                  <td>{blank(entry.episodes)}</td>
                  <td className="c-period">{entry.period || 'UNTEMPORAL'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {selected ? (
        <div className="db-detail on">
          <div className="c-title">{selected.title}</div>
          <div className="tag" style={{ borderColor: selected.color, color: selected.color }}>
            {selected.universe || 'UNKNOWN'}
          </div>
          {selected.note ? (
            <div className="c-line">
              NOTE: <b>{selected.note}</b>
            </div>
          ) : null}
          <div className="c-line">
            SEASON: <b>{blank(selected.season)}</b>
            &nbsp;&nbsp; EPISODES: <b>{blank(selected.episodes)}</b>
          </div>
          <div className="c-line">
            TIME PERIOD: <b>{selected.period || 'UNTEMPORAL'}</b>
          </div>
          <div style={{ marginTop: 6 }}>
            <button
              className="btn"
              onClick={() =>
                setWatched((current) => ({ ...current, [selected.id]: !current[selected.id] }))
              }
            >
              {watched[selected.id] ? '✓ WATCHED' : 'MARK WATCHED'}
            </button>
            {selected.loom ? (
              <button className="btn" onClick={() => onOpenInLoom(selected.id)}>
                OPEN IN LOOM ⟶
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className={`rl-panel${queueCollapsed ? ' rl-collapsed' : ''}`}>
        <button className="rl-head" onClick={() => setQueueCollapsed((value) => !value)}>
          RELEASE QUEUE // TO BE ADDED
          <span className="rl-count">
            {queueDoneCount} / {queueItems.length}
          </span>
        </button>
        <div className="rl-body">
          {queueItems.map((item) => {
            const done = !!queueDone[item.key]
            const chipClass = item.tag === 'RELEASED' ? 'out' : item.tag === 'UPCOMING' ? 'up' : ''
            return (
              <div key={item.key} className={`rl-row${done ? ' done' : ''}`}>
                <button
                  className={`rl-box${done ? ' on' : ''}`}
                  aria-label={done ? 'Mark incomplete' : 'Mark complete'}
                  onClick={() =>
                    setQueueDone((current) => ({ ...current, [item.key]: !current[item.key] }))
                  }
                >
                  {done ? '✓' : ''}
                </button>
                <div className="rl-txt">
                  <div className="rl-t">
                    {item.title}
                    {item.tag ? <span className={`rl-chip ${chipClass}`}>{item.tag}</span> : null}
                  </div>
                </div>
                <button
                  className="rl-x"
                  title="REMOVE"
                  aria-label={`Remove ${item.title}`}
                  onClick={() => setQueueGone((current) => ({ ...current, [item.key]: true }))}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
        <div className="rl-add">
          <input
            value={queueDraft}
            onChange={(event) => setQueueDraft(event.target.value.slice(0, 120))}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              const title = queueDraft.trim()
              if (!title) return
              setCustomQueue((current) => [
                { key: `c${Date.now()}`, title, tag: '', match: '' },
                ...current,
              ])
              setQueueDraft('')
            }}
            placeholder="ADD ITEM..."
            aria-label="Add release queue item"
          />
          <button
            className="btn"
            onClick={() => {
              const title = queueDraft.trim()
              if (!title) return
              setCustomQueue((current) => [
                { key: `c${Date.now()}`, title, tag: '', match: '' },
                ...current,
              ])
              setQueueDraft('')
            }}
          >
            ADD
          </button>
        </div>
      </div>
    </section>
  )
}
