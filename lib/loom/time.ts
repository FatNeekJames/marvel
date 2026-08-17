export const MOD0 = 1900
export const TIME_SCALE = 1.3

export function yearToX(year: number): number {
  if (year >= MOD0 && year < 2033) return (year - MOD0) * TIME_SCALE
  if (year < MOD0) return (year - MOD0) * TIME_SCALE * 0.045
  return (2033 - MOD0) * TIME_SCALE + (year - 2033) * TIME_SCALE * 0.15
}

export function xToYear(x: number): string {
  if (x < 0) {
    const year = MOD0 + x / (TIME_SCALE * 0.045)
    return year < 1 ? `${Math.round(1 - year)} BC` : String(Math.round(year))
  }
  let year =
    x <= (2033 - MOD0) * TIME_SCALE
      ? MOD0 + x / TIME_SCALE
      : 2033 + (x - (2033 - MOD0) * TIME_SCALE) / (TIME_SCALE * 0.15)
  year = Math.round(year)
  if (year <= 0) return `${1 - year} BC`
  return `${year}${year > 2033 ? ' +' : ''}`
}

export function midYear(yearStart: number | null, yearEnd: number | null): number | null {
  if (yearStart == null && yearEnd == null) return null
  const start = yearStart ?? yearEnd!
  const end = yearEnd ?? yearStart!
  return (start + end) / 2
}
