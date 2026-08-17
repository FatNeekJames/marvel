export const DOOM_TARGET = Date.UTC(2026, 11, 18)

export const DOOM_PLACEHOLDER = {
  zero: false,
  tick: '--:--:--:--',
  sub: 'T-MINUS COUNTDOWN',
} as const

export type DoomState = {
  zero: boolean
  tick: string
  sub: string
}

function pad2(value: number) {
  return value < 10 ? `0${value}` : String(value)
}

export function doomParts(now: number): DoomState {
  const ms = DOOM_TARGET - now
  if (ms <= 0) return { zero: true, tick: '00:00:00:00', sub: 'THE DAY HAS COME — PORTALS OPEN' }
  const days = Math.floor(ms / 86400000)
  return {
    zero: false,
    tick: `${pad2(days)}:${pad2(Math.floor(ms / 3600000) % 24)}:${pad2(Math.floor(ms / 60000) % 60)}:${pad2(Math.floor(ms / 1000) % 60)}`,
    sub: `T-MINUS ${days} DAYS`,
  }
}

let clientSnapshot: DoomState = DOOM_PLACEHOLDER
let clientSecond = Number.NaN

export function getDoomClientSnapshot(): DoomState {
  const second = Math.floor(Date.now() / 1000)
  if (second === clientSecond) return clientSnapshot
  clientSecond = second
  clientSnapshot = doomParts(Date.now())
  return clientSnapshot
}

export function getDoomServerSnapshot(): DoomState {
  return DOOM_PLACEHOLDER
}

export function subscribeDoom(onStoreChange: () => void) {
  const id = window.setInterval(onStoreChange, 250)
  return () => window.clearInterval(id)
}
