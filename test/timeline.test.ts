import { describe, expect, it } from 'vitest'
import { normalizeQuery } from '../lib/domain/timeline'
import seedData from '../lib/db/seed-data.json'
import { earthColor } from '../lib/loom/colors'
import { layoutLoomPoints, toLoomPoint } from '../lib/loom/points'
import { yearToX, xToYear, midYear } from '../lib/loom/time'
import { doomParts, getDoomServerSnapshot } from '../lib/loom/doom'
import type { TimelineEntry } from '../lib/domain/timeline'

describe('normalizeQuery', () => {
  it('applies stable defaults', () =>
    expect(normalizeQuery({})).toEqual({ dataset: 'main', reality: '', search: '', limit: 500 }))
  it('trims input and caps limits', () =>
    expect(normalizeQuery({ dataset: ' main ', search: ' iron man ', limit: 10_000 })).toEqual({
      dataset: 'main',
      reality: '',
      search: 'iron man',
      limit: 500,
    }))
  it('prevents unbounded or empty queries', () =>
    expect(normalizeQuery({ limit: -4 })).toMatchObject({ limit: 1 }))
})

describe('timeline seed', () => {
  it('contains every migrated record with stable unique keys', () => {
    expect(seedData).toHaveLength(278)
    expect(new Set(seedData.map(({ legacyKey }) => legacyKey)).size).toBe(seedData.length)
  })

  it('contains only bounded values accepted by the database schema', () => {
    expect(
      seedData.every(
        ({ title, reality, legacyKey }) =>
          title.length > 0 && reality.length > 0 && legacyKey.length <= 100,
      ),
    ).toBe(true)
  })
})

describe('loom time mapping', () => {
  it('places 2012 near the modern trunk and BC years far left', () => {
    expect(yearToX(2012)).toBeCloseTo(145.6, 5)
    expect(yearToX(-1200)).toBeLessThan(-100)
    expect(yearToX(2099)).toBeGreaterThan(yearToX(2033))
  })

  it('round-trips modern years through xToYear', () => {
    expect(xToYear(yearToX(2016))).toBe('2016')
  })

  it('averages start and end years', () => {
    expect(midYear(2008, 2010)).toBe(2009)
    expect(midYear(null, null)).toBeNull()
  })
})

describe('loom colors and layout', () => {
  it('keeps Earth-616 on the gold thread', () => {
    expect(earthColor('Earth-616')).toBe('#ffd24a')
  })

  it('assigns stable coordinates for the same seed order', () => {
    const sample: TimelineEntry = {
      id: '1',
      legacyKey: 'main:0',
      dataset: 'main',
      title: 'Iron Man',
      universe: 'Earth-616',
      reality: 'Earth-616',
      note: null,
      season: null,
      episodes: null,
      period: '02/2008-05/2008',
      yearStart: 2008,
      yearEnd: 2008,
    }
    const first = layoutLoomPoints([toLoomPoint(sample, 0, true)])
    const second = layoutLoomPoints([toLoomPoint(sample, 0, true)])
    expect(first.points[0]?.x0).toBe(second.points[0]?.x0)
    expect(first.points[0]?.color).toBe('#ffd24a')
  })
})

describe('doomsday clock', () => {
  it('uses a stable server snapshot that does not depend on Date.now', () => {
    expect(getDoomServerSnapshot()).toEqual({
      zero: false,
      tick: '--:--:--:--',
      sub: 'T-MINUS COUNTDOWN',
    })
    expect(getDoomServerSnapshot()).toBe(getDoomServerSnapshot())
  })

  it('formats a frozen instant without reading the system clock', () => {
    expect(doomParts(Date.UTC(2026, 7, 17, 21, 17, 0))).toMatchObject({
      zero: false,
      tick: '122:02:43:00',
      sub: 'T-MINUS 122 DAYS',
    })
  })

  it('switches to the zero state after the release instant', () => {
    expect(doomParts(Date.UTC(2026, 11, 18))).toEqual({
      zero: true,
      tick: '00:00:00:00',
      sub: 'THE DAY HAS COME — PORTALS OPEN',
    })
  })
})
