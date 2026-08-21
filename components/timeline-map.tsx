'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LoomPoint, TrunkLayout } from '@/lib/loom/points'
import { xToYear } from '@/lib/loom/time'

export type LoomSelection = {
  point: LoomPoint
  pinned: boolean
  clientX?: number
  clientY?: number
}

export type LoomHandle = {
  setLabels: (on: boolean) => void
  setFocus: (on: boolean) => void
  setAnim: (on: boolean) => void
  setSpeed: (value: number) => void
  setActiveEarth: (reality: string | null) => void
  setScrub: (value: number) => void
  setScrubPlaying: (on: boolean) => void
  flyTo: (id: string) => void
  pin: (id: string | null) => void
  scrubLabel: () => string
}

type Props = {
  points: readonly LoomPoint[]
  layout: TrunkLayout
  onSelect: (selection: LoomSelection | null) => void
  onScrubLabel: (label: string) => void
  onScrubValue: (value: number) => void
  apiRef: React.MutableRefObject<LoomHandle | null>
}

const EARTH_616 = 'Earth-616'
const BRANCH_GAP = 9
const MAP_HEIGHT = 260
const TIME_X_SCALE = 3
const PAD_X = 110
const mapX = (x: number) => x * TIME_X_SCALE

export function TimelineMap({
  points,
  layout,
  onSelect,
  onScrubLabel,
  onScrubValue,
  apiRef,
}: Props) {
  const host = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const drag = useRef<{ x: number; viewX: number } | null>(null)
  const [labels, setLabels] = useState(false)
  const [activeEarth, setActiveEarth] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [scrub, setScrub] = useState(1000)
  const [scrubPlaying, setScrubPlaying] = useState(false)
  const [speed, setSpeed] = useState(24)
  const minX = mapX(layout.trunkMin) - PAD_X
  const fullWidth = Math.max(mapX(layout.spanX) + PAD_X * 2, 600)
  const overviewView = useMemo(() => {
    const positions = points.map((point) => mapX(point.x0)).sort((a, b) => a - b)
    if (!positions.length) return { x: minX, width: fullWidth }
    const low = positions[Math.floor((positions.length - 1) * 0.02)]!
    const high = positions[Math.ceil((positions.length - 1) * 0.98)]!
    const x = Math.max(minX, low - 24)
    const width = Math.min(fullWidth, Math.max(180, high - low + 48))
    return { x, width }
  }, [fullWidth, minX, points])
  const [view, setView] = useState(overviewView)

  const lanes = useMemo(() => {
    const counts = new Map<string, number>()
    for (const point of points) {
      const reality = point.reality || 'UNKNOWN'
      counts.set(reality, (counts.get(reality) ?? 0) + 1)
    }
    const others = [...counts.keys()]
      .filter((reality) => reality !== EARTH_616)
      .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b))
    return [EARTH_616, ...others]
  }, [points])

  const laneY = useMemo(() => {
    const positions = new Map<string, number>([[EARTH_616, MAP_HEIGHT / 2]])
    lanes.slice(1).forEach((reality, index) => {
      const distance = (Math.floor(index / 2) + 1) * BRANCH_GAP
      positions.set(reality, MAP_HEIGHT / 2 + (index % 2 === 0 ? -distance : distance))
    })
    return positions
  }, [lanes])
  const laneExtent = useMemo(() => {
    const extents = new Map<string, { start: number; end: number }>()
    for (const point of points) {
      const reality = point.reality || 'UNKNOWN'
      const current = extents.get(reality)
      const x = mapX(point.x0)
      if (!current) extents.set(reality, { start: x, end: x })
      else {
        current.start = Math.min(current.start, x)
        current.end = Math.max(current.end, x)
      }
    }
    return extents
  }, [points])
  const height = MAP_HEIGHT
  const mainY = laneY.get(EARTH_616) ?? height / 2
  const scrubX = mapX(layout.trunkMin + (layout.spanX * scrub) / 1000)
  const zoom = fullWidth / view.width

  const updateScrub = useCallback(
    (value: number) => {
      const next = Math.max(0, Math.min(1000, value))
      setScrub(next)
      const x = layout.trunkMin + (layout.spanX * next) / 1000
      onScrubLabel(next >= 999 ? 'ALL TEMPORAL POINTS' : `THROUGH ${xToYear(x)}`)
    },
    [layout, onScrubLabel],
  )

  const flyTo = useCallback(
    (id: string) => {
      const point = points.find((item) => item.id === id)
      if (!point) return
      const nextWidth = Math.min(view.width, Math.max(fullWidth / 5, 190))
      setView({ x: mapX(point.x0) - nextWidth / 2, width: nextWidth })
      setSelectedId(point.id)
      onSelect({ point, pinned: true })
    },
    [fullWidth, onSelect, points, view.width],
  )

  useEffect(() => {
    apiRef.current = {
      setLabels,
      setFocus: () => {},
      setAnim: () => {},
      setSpeed,
      setActiveEarth,
      setScrub: updateScrub,
      setScrubPlaying,
      flyTo,
      pin: (id) => {
        setSelectedId(id)
        if (!id) onSelect(null)
      },
      scrubLabel: () =>
        scrub >= 999 ? 'ALL TEMPORAL POINTS' : `THROUGH ${xToYear(scrubX / TIME_X_SCALE)}`,
    }
    return () => {
      apiRef.current = null
    }
  }, [apiRef, flyTo, onSelect, scrub, scrubX, updateScrub])

  useEffect(() => {
    if (!scrubPlaying) return
    const interval = window.setInterval(() => {
      setScrub((current) => {
        const next = (current + Math.max(speed / 20, 0.5)) % 1001
        onScrubValue(next)
        const x = layout.trunkMin + (layout.spanX * next) / 1000
        onScrubLabel(`THROUGH ${xToYear(x)}`)
        return next
      })
    }, 40)
    return () => window.clearInterval(interval)
  }, [layout, onScrubLabel, onScrubValue, scrubPlaying, speed])

  const zoomAt = (factor: number, anchor = 0.5) => {
    setView((current) => {
      const width = Math.max(90, Math.min(fullWidth, current.width * factor))
      const worldAnchor = current.x + current.width * anchor
      const x = Math.max(minX, Math.min(minX + fullWidth - width, worldAnchor - width * anchor))
      return { x, width }
    })
  }
  const years = useMemo(() => {
    const result: number[] = []
    for (let x = Math.ceil(layout.trunkMin / 50) * 50; x <= layout.trunkMax; x += 50) result.push(x)
    return result
  }, [layout])

  const parentReality = (reality: string) => {
    if (reality.endsWith(' - Adjacent')) {
      const rawParent = reality.replace(/ - Adjacent$/, '')
      const parent = rawParent === 'Earth 616' ? EARTH_616 : rawParent
      if (laneY.has(parent)) return parent
    }
    if (/B$/.test(reality)) {
      const parent = reality.slice(0, -1)
      if (laneY.has(parent)) return parent
    }
    return null
  }

  return (
    <div className="timeline-map" ref={host}>
      <div className="map-toolbar" aria-label="Timeline navigation">
        <span>
          CHRONOLOGY // {lanes.length} REALITY BRANCHES // {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => zoomAt(0.5)} aria-label="Zoom in">
          ＋
        </button>
        <button onClick={() => zoomAt(2)} aria-label="Zoom out">
          −
        </button>
        <button
          onClick={() => {
            setActiveEarth(null)
            setSelectedId(null)
            onSelect(null)
            setView(overviewView)
          }}
        >
          OVERVIEW
        </button>
        <button
          onClick={() => {
            setActiveEarth(EARTH_616)
            const extent = laneExtent.get(EARTH_616)
            if (extent) {
              const x = Math.max(minX, extent.start - 20)
              setView({ x, width: Math.max(150, extent.end - extent.start + 40) })
            }
          }}
        >
          RETURN TO EARTH-616
        </button>
      </div>
      <div className="year-ruler" aria-label="Timeline years">
        <span className="year-ruler-title">YEAR</span>
        {years
          .filter((x) => mapX(x) >= view.x && mapX(x) <= view.x + view.width)
          .map((x) => (
            <span
              key={x}
              className="year-ruler-tick"
              style={{ left: `${((mapX(x) - view.x) / view.width) * 100}%` }}
            >
              {xToYear(x)}
            </span>
          ))}
      </div>
      <svg
        ref={svg}
        className="timeline-svg"
        viewBox={`${view.x} 0 ${view.width} ${height}`}
        role="img"
        aria-label="Horizontal map of Marvel projects across reality lanes"
        onWheel={(event) => {
          event.preventDefault()
          const rect = svg.current?.getBoundingClientRect()
          zoomAt(
            event.deltaY > 0 ? 1.14 : 0.86,
            rect ? (event.clientX - rect.left) / rect.width : 0.5,
          )
        }}
        onPointerDown={(event) => {
          if ((event.target as Element).closest('.project-mark')) return
          drag.current = { x: event.clientX, viewX: view.x }
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          if (!drag.current) return
          const rect = event.currentTarget.getBoundingClientRect()
          const dx = ((event.clientX - drag.current.x) / rect.width) * view.width
          const x = Math.max(minX, Math.min(minX + fullWidth - view.width, drag.current.viewX - dx))
          setView((current) => ({ ...current, x }))
        }}
        onPointerUp={() => {
          drag.current = null
        }}
      >
        <defs>
          <pattern id="minorGrid" width="75" height={BRANCH_GAP} patternUnits="userSpaceOnUse">
            <path
              d={`M 75 0 L 0 0 0 ${BRANCH_GAP}`}
              fill="none"
              stroke="#27304a"
              strokeOpacity="0.22"
              strokeWidth="0.6"
            />
          </pattern>
          <filter id="goldGlow">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x={minX} width={fullWidth} height={height} fill="url(#minorGrid)" />
        {years.map((x) => (
          <g key={x}>
            <line x1={mapX(x)} x2={mapX(x)} y1={46} y2={height - 30} className="year-line" />
            <text x={mapX(x) + 4} y={38} className="year-label">
              {xToYear(x)}
            </text>
          </g>
        ))}
        {lanes.map((reality) => {
          const y = laneY.get(reality)!
          const sample = points.find((point) => (point.reality || 'UNKNOWN') === reality)
          const color = reality === EARTH_616 ? '#ffd24a' : (sample?.color ?? '#8fa0c8')
          const extent = laneExtent.get(reality) ?? {
            start: mapX(layout.trunkMin),
            end: mapX(layout.trunkMax),
          }
          const start = extent.start
          const end = Math.max(extent.end + 18, start + 34)
          const parent = reality === EARTH_616 ? null : (parentReality(reality) ?? EARTH_616)
          const parentY = parent ? laneY.get(parent) : null
          return (
            <g
              key={reality}
              className={activeEarth !== null && activeEarth !== reality ? 'lane dim' : 'lane'}
            >
              {parentY != null ? (
                <path
                  d={`M ${start - 28} ${parentY} C ${start - 10} ${parentY}, ${start - 18} ${y}, ${start} ${y}`}
                  fill="none"
                  stroke={color}
                  className="reality-splinter"
                />
              ) : (
                <path
                  d={`M ${start - 12} ${y + 10} Q ${start - 7} ${y} ${start} ${y}`}
                  fill="none"
                  stroke={color}
                  className="reality-entry"
                />
              )}
              <line
                x1={start}
                x2={end}
                y1={y}
                y2={y}
                stroke={color}
                className={reality === EARTH_616 ? 'main-line' : 'reality-line'}
              />
              <rect x={start + 3} y={y - 17} width={105} height={16} className="lane-label-bg" />
              <text x={start + 7} y={y - 6} fill={color} className="lane-label">
                {reality}
              </text>
            </g>
          )
        })}
        {points.map((point) => {
          const reality = point.reality || 'UNKNOWN'
          const y = laneY.get(reality) ?? mainY
          const selected = point.id === selectedId
          const pointX = mapX(point.x0)
          const hidden = pointX > scrubX || (activeEarth !== null && activeEarth !== reality)
          const showLabel =
            labels ||
            selected ||
            zoom > 2.1 ||
            point.index % Math.max(2, Math.ceil(7 / Math.max(zoom, 1))) === 0
          const above = point.index % 2 === 0
          const tickEnd = y + (above ? -8 : 8)
          return (
            <g
              key={point.id}
              className={`project-mark${selected ? ' selected' : ''}${hidden ? ' hidden' : ''}`}
              role="button"
              tabIndex={0}
              aria-label={`${point.title}, ${reality}, ${point.period ?? 'date unknown'}`}
              onFocus={() => onSelect({ point, pinned: false })}
              onBlur={() => {
                if (!selected) onSelect(null)
              }}
              onClick={(event) => {
                event.stopPropagation()
                setSelectedId(point.id)
                onSelect({ point, pinned: true, clientX: event.clientX, clientY: event.clientY })
              }}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                setSelectedId(point.id)
                onSelect({ point, pinned: true })
              }}
              onMouseEnter={(event) => {
                if (!selected)
                  onSelect({ point, pinned: false, clientX: event.clientX, clientY: event.clientY })
              }}
              onMouseLeave={() => {
                if (!selected) onSelect(null)
              }}
            >
              <line
                x1={pointX}
                x2={pointX}
                y1={y}
                y2={tickEnd}
                stroke={point.color}
                className="tick-mark"
              />
              <circle cx={pointX} cy={y} r={selected ? 3.8 : 2.4} fill={point.color} />
              {showLabel ? (
                <text x={pointX + 3} y={tickEnd + (above ? -3 : 10)} className="project-label">
                  {point.title.length > 30 ? `${point.title.slice(0, 29)}…` : point.title}
                </text>
              ) : null}
            </g>
          )
        })}
        <line x1={scrubX} x2={scrubX} y1={44} y2={height - 20} className="scrub-line" />
      </svg>
    </div>
  )
}
