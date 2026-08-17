import type { TimelineEntry } from '../domain/timeline'
import { earthColor } from './colors'
import { midYear, yearToX } from './time'

export type LoomPoint = Readonly<{
  id: string
  index: number
  title: string
  universe: string
  reality: string
  note: string | null
  season: string | null
  episodes: string | null
  period: string | null
  year: number | null
  yearMin: number | null
  zig: boolean
  loom: boolean
  color: string
  x0: number
  theta: number
  phi: number
  length: number
}>

export type TrunkLayout = Readonly<{
  trunkMin: number
  trunkMax: number
  spanX: number
}>

const JUMP_PATTERN = /transport|the void|reboot|time travell|quantum realm/

export function toLoomPoint(entry: TimelineEntry, index: number, loom: boolean): LoomPoint {
  const year = midYear(entry.yearStart, entry.yearEnd)
  const jumpTxt = `${entry.universe} ${entry.period ?? ''}`.toLocaleLowerCase()
  return {
    id: entry.id,
    index,
    title: entry.title,
    universe: entry.universe,
    reality: entry.reality,
    note: entry.note,
    season: entry.season,
    episodes: entry.episodes,
    period: entry.period,
    year,
    yearMin: entry.yearStart,
    zig: JUMP_PATTERN.test(jumpTxt) || year == null,
    loom,
    color: earthColor(entry.reality),
    x0: 0,
    theta: 0,
    phi: 0,
    length: 0,
  }
}

export function layoutLoomPoints(entries: readonly LoomPoint[]): {
  points: LoomPoint[]
  layout: TrunkLayout
} {
  const dated = entries.filter((entry) => entry.year != null)
  const undated = entries.filter((entry) => entry.year == null)
  let minX = Infinity
  let maxX = -Infinity
  const withX = dated.map((entry) => {
    const x0 = yearToX(entry.year!)
    if (x0 < minX) minX = x0
    if (x0 > maxX) maxX = x0
    return { ...entry, x0 }
  })
  if (!Number.isFinite(minX)) {
    minX = 0
    maxX = 0
  }
  const placed = [
    ...withX,
    ...undated.map((entry, index) => ({ ...entry, x0: maxX + 34 + index * 11 })),
  ]
  const realities = [...new Set(placed.map((entry) => entry.reality))].sort()
  const count = Math.max(realities.length, 1)
  const points = placed.map((entry) => {
    const li = realities.indexOf(entry.reality)
    const frac = (li + 0.5) / count
    const jitter = ((entry.index * 37) % 13) / 13 - 0.5
    return {
      ...entry,
      theta: frac * Math.PI * 0.86 + 0.06 + jitter * 0.05,
      phi: frac * Math.PI * 0.5 - Math.PI * 0.22 + jitter * 0.04,
      length: 46 + (li % 5) * 5 + ((entry.index * 11) % 9) * 0.5,
    }
  })
  const trunkMin = Math.min(minX, -220) - 20
  const trunkMax = maxX + 170
  return { points, layout: { trunkMin, trunkMax, spanX: trunkMax - trunkMin } }
}
