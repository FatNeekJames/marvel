'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { TimelineEntry } from '@/lib/domain/timeline'
import { earthColor } from '@/lib/loom/colors'
import { getDoomClientSnapshot, getDoomServerSnapshot, subscribeDoom } from '@/lib/loom/doom'
import { layoutLoomPoints, toLoomPoint, type LoomPoint } from '@/lib/loom/points'
import { UNIVERSES } from '@/lib/loom/queue'
import { DatabaseView } from '@/components/database-view'
import { TimelineCanvas, type LoomHandle, type LoomSelection } from '@/components/timeline-canvas'

type Props = {
  datasets: Readonly<{
    main: readonly TimelineEntry[]
    nineties: readonly TimelineEntry[]
    tens: readonly TimelineEntry[]
    universeKeys: readonly TimelineEntry[]
  }>
}

function na(value: string | null) {
  return !value || value === 'N/A' ? null : value
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)')
      media.addEventListener('change', onStoreChange)
      return () => media.removeEventListener('change', onStoreChange)
    },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  )
}

export function TimelineExplorer({ datasets }: Props) {
  const [view, setView] = useState<'loom' | 'database'>('loom')
  const [labels, setLabels] = useState(false)
  const [focus, setFocus] = useState(false)
  const reducedMotion = usePrefersReducedMotion()
  const [animUser, setAnimUser] = useState<boolean | null>(null)
  const anim = animUser ?? !reducedMotion
  const [speed, setSpeed] = useState(24)
  const [activeEarth, setActiveEarth] = useState<string | null>(null)
  const [legendOpen, setLegendOpen] = useState(false)
  const [scrubPlaying, setScrubPlaying] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [universe, setUniverse] = useState<(typeof UNIVERSES)[number]['key']>('marvel')
  const [doomCollapsed, setDoomCollapsed] = useState(false)
  const doom = useSyncExternalStore(subscribeDoom, getDoomClientSnapshot, getDoomServerSnapshot)
  const [selection, setSelection] = useState<LoomSelection | null>(null)
  const loom = useRef<LoomHandle | null>(null)
  const pendingFly = useRef<string | null>(null)
  const scrubInput = useRef<HTMLInputElement>(null)
  const scrubLabelEl = useRef<HTMLSpanElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const mapped = useMemo(
    () => ({
      main: datasets.main.map((entry, index) => toLoomPoint(entry, index, true)),
      '90s': datasets.nineties.map((entry, index) => toLoomPoint(entry, index, false)),
      '2010s': datasets.tens.map((entry, index) => toLoomPoint(entry, index, false)),
      'universe-keys': datasets.universeKeys.map((entry, index) =>
        toLoomPoint(entry, index, false),
      ),
    }),
    [datasets],
  )
  const { points, layout } = useMemo(() => layoutLoomPoints(mapped.main), [mapped.main])
  const realities = useMemo(() => {
    const counts = new Map<string, number>()
    for (const point of points) counts.set(point.reality, (counts.get(point.reality) ?? 0) + 1)
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [points])
  const currentUniverse = UNIVERSES.find((item) => item.key === universe) ?? UNIVERSES[0]!

  useEffect(() => {
    loom.current?.setLabels(labels)
  }, [labels])
  useEffect(() => {
    loom.current?.setFocus(focus)
  }, [focus])
  useEffect(() => {
    loom.current?.setAnim(anim)
  }, [anim])
  useEffect(() => {
    loom.current?.setSpeed(speed)
  }, [speed])
  useEffect(() => {
    loom.current?.setActiveEarth(activeEarth)
  }, [activeEarth])
  useEffect(() => {
    loom.current?.setScrubPlaying(scrubPlaying)
  }, [scrubPlaying])

  useEffect(() => {
    if (view !== 'loom' || !pendingFly.current) return
    const id = pendingFly.current
    pendingFly.current = null
    requestAnimationFrame(() => loom.current?.flyTo(id))
  }, [view])

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target)) return
      if ((event.target as HTMLElement).closest('#burger')) return
      setMenuOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  const cardStyle = selection?.pinned
    ? { display: 'block' as const, top: '', bottom: 18, left: 14 }
    : selection
      ? {
          display: 'block' as const,
          top: Math.min(window.innerHeight - 160, (selection.clientY ?? 0) + 18),
          left: Math.min(window.innerWidth - 380, (selection.clientX ?? 0) + 18),
          bottom: 'auto' as const,
        }
      : { display: 'none' as const }

  return (
    <>
      <div style={{ display: view === 'loom' ? 'block' : 'none' }}>
        <TimelineCanvas
          points={points}
          layout={layout}
          apiRef={loom}
          onSelect={setSelection}
          onScrubLabel={(label) => {
            if (scrubLabelEl.current) scrubLabelEl.current.textContent = label
          }}
          onScrubValue={(value) => {
            if (scrubInput.current) scrubInput.current.value = String(Math.round(value))
          }}
        />
        <div className="vignette" />
      </div>

      <button
        className={`hud panel${menuOpen ? ' on' : ''}`}
        id="burger"
        title="UNIVERSES"
        aria-expanded={menuOpen}
        aria-controls="uniMenu"
        onClick={(event) => {
          event.stopPropagation()
          setMenuOpen((open) => !open)
        }}
      >
        <span className="bar" />
        <span className="bar" />
        <span className="bar" />
      </button>
      <div className={`hud panel${menuOpen ? ' on' : ''}`} id="uniMenu" role="menu" ref={menuRef}>
        <div className="uni-title">UNIVERSES</div>
        {UNIVERSES.map((item) => (
          <button
            key={item.key}
            className={`uni-item${universe === item.key ? ' act' : ''}`}
            role="menuitem"
            onClick={() => {
              setUniverse(item.key)
              setMenuOpen(false)
            }}
          >
            <span className="u-dot" style={{ background: item.swatch, color: item.swatch }} />
            <span className="u-name">{item.name}</span>
            <span className="u-st">{item.pending ? 'PENDING' : 'INDEXED'}</span>
          </button>
        ))}
      </div>
      <div className={universe === 'marvel' ? '' : 'on'} id="uniShell">
        <div
          className="tag"
          style={{ borderColor: currentUniverse.swatch, color: currentUniverse.swatch }}
        >
          {currentUniverse.name}
        </div>
        <div className="shell-name" style={{ color: currentUniverse.swatch }}>
          {currentUniverse.name}
        </div>
        <div className="shell-tag">{currentUniverse.tag}</div>
        <div className="shell-st">DATASET PENDING — NOT YET INDEXED</div>
        <div className="shell-hint">OPEN THE ☰ MENU AND SELECT MARVEL MAIN TO RETURN</div>
      </div>

      <nav className="hud tabs" id="tabbar" aria-label="Primary view">
        <button className={`tab${view === 'loom' ? ' act' : ''}`} onClick={() => setView('loom')}>
          LOOM VIEW
        </button>
        <button
          className={`tab${view === 'database' ? ' act' : ''}`}
          onClick={() => setView('database')}
        >
          ENTRY DATABASE
        </button>
      </nav>

      {view === 'loom' ? (
        <>
          <header className="hud panel" id="title">
            <h1>TVA // MULTIVERSAL TEMPORAL LOOM</h1>
            <div className="sub">
              MARVEL CINEMATIC MULTIVERSE // {points.length} TEMPORAL POINTS
            </div>
          </header>
          <aside className="hud panel" id="controls">
            <h2>LOOM CONTROLS</h2>
            <div className="row">
              <label htmlFor="tgLabels">Labels</label>
              <button
                id="tgLabels"
                className={`toggle${labels ? ' on' : ''}`}
                aria-pressed={labels}
                onClick={() => setLabels((value) => !value)}
              />
            </div>
            <div className="row">
              <label htmlFor="tgFocus">Focus</label>
              <button
                id="tgFocus"
                className={`toggle${focus ? ' on' : ''}`}
                aria-pressed={focus}
                onClick={() => setFocus((value) => !value)}
              />
            </div>
            <div className="row">
              <label htmlFor="tgAnim">Animation</label>
              <button
                id="tgAnim"
                className={`toggle${anim ? ' on' : ''}`}
                aria-pressed={anim}
                onClick={() => setAnimUser((value) => !(value ?? !reducedMotion))}
              />
            </div>
            <div className="row">
              <label htmlFor="speed">Speed</label>
              <input
                id="speed"
                type="range"
                min={0}
                max={200}
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
              />
            </div>
            <div className="btns">
              <button className="btn" onClick={() => setActiveEarth(null)}>
                ALL REALITIES
              </button>
              <button className="btn" onClick={() => setActiveEarth('Earth-616')}>
                EARTH-616
              </button>
              <button className="btn" onClick={() => setLegendOpen((open) => !open)}>
                {legendOpen ? 'REALITIES ▾' : 'REALITIES ▸'}
              </button>
            </div>
            <div id="scrubWrap">
              <div className="row">
                <label htmlFor="scrub">Time flow</label>
                <input
                  id="scrub"
                  ref={scrubInput}
                  type="range"
                  min={0}
                  max={1000}
                  defaultValue={1000}
                  onChange={(event) => {
                    setScrubPlaying(false)
                    loom.current?.setScrub(Number(event.target.value))
                    if (scrubLabelEl.current) {
                      scrubLabelEl.current.textContent =
                        loom.current?.scrubLabel() ?? 'ALL TEMPORAL POINTS'
                    }
                  }}
                />
              </div>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <button
                  className={`btn${scrubPlaying ? ' act' : ''}`}
                  onClick={() => setScrubPlaying((value) => !value)}
                >
                  {scrubPlaying ? 'PAUSE' : 'PLAY'}
                </button>
                <span id="scrubLabel" ref={scrubLabelEl}>
                  ALL TEMPORAL POINTS
                </span>
              </div>
            </div>
          </aside>
          <aside className={`hud panel${legendOpen ? '' : ' collapsed'}`} id="legend">
            <h2>REALITIES</h2>
            <div>
              {realities.map(([name, count]) => {
                const color = earthColor(name)
                return (
                  <button
                    key={name}
                    className={`leg-row${activeEarth === name ? ' on' : ''}${activeEarth && activeEarth !== name ? ' dim' : ''}`}
                    onClick={() => setActiveEarth(name)}
                  >
                    <span className="leg-swatch" style={{ background: color, color }} />
                    <span className="leg-name">{name || 'UNKNOWN'}</span>
                    <span className="leg-count">{count}</span>
                  </button>
                )
              })}
            </div>
          </aside>
          <article className={`hud panel${selection ? ' on' : ''}`} id="card" style={cardStyle}>
            {selection ? (
              <EntryCard point={selection.point} onClose={() => setSelection(null)} />
            ) : null}
          </article>
          <p className="hud" id="help">
            DRAG: ORBIT &nbsp;&bull;&nbsp; RIGHT-DRAG: PAN &nbsp;&bull;&nbsp; SCROLL: ZOOM
            &nbsp;&bull;&nbsp; DBL-CLICK: FLY TO POINT
          </p>
        </>
      ) : (
        <DatabaseView
          datasets={mapped}
          onOpenInLoom={(id) => {
            pendingFly.current = id
            setView('loom')
          }}
        />
      )}
      <aside
        className={`hud panel${doomCollapsed ? ' collapse' : ''}${doom.zero ? ' zero' : ''}`}
        id="doom"
      >
        <h2 onClick={() => setDoomCollapsed((value) => !value)}>DOOMSDAY CLOCK</h2>
        <div className="doom-d">AVENGERS: DOOMSDAY — RELEASES 18.12.2026</div>
        <div className="doom-t">{doom.tick}</div>
        <div className="doom-s">{doom.sub}</div>
      </aside>
    </>
  )
}

function EntryCard({ point, onClose }: { point: LoomPoint; onClose: () => void }) {
  return (
    <>
      <div className="c-head">
        <span className="c-title">{point.title}</span>
        <button className="c-x" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className="tag" style={{ borderColor: point.color, color: point.color }}>
        {point.universe || 'UNKNOWN'}
      </div>
      {point.note ? (
        <div className="c-line">
          NOTE: <b>{point.note}</b>
        </div>
      ) : null}
      {na(point.season) ? (
        <div className="c-line">
          SEASON: <b>{point.season}</b>
        </div>
      ) : null}
      {na(point.episodes) ? (
        <div className="c-line">
          EPISODES: <b>{point.episodes}</b>
        </div>
      ) : null}
      <div className="c-line">
        TIME PERIOD: <b>{point.period || 'UNTEMPORAL'}</b>
      </div>
    </>
  )
}
