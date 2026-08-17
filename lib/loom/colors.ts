export const COLOR_OVERRIDES: Readonly<Record<string, string>> = {
  'Earth-616': '#ffd24a',
  'Earth 616 - Adjacent': '#ffdd77',
  'Earth-10005': '#39c7ff',
  'Earth-11584': '#ff5ec4',
  'Earth-15584': '#ff5ec4',
  'Earth-TRN676': '#ff9a3c',
  TRN676: '#ff9a3c',
  'Earth-TRN414': '#ff3b3b',
  TRN414: '#ff3b3b',
  'Earth-688': '#3bff8f',
  'Earth-688B': '#7bff5e',
  'Earth-89521': '#b66bff',
  'Earth-1610': '#ff5b7f',
  'Earth-96283': '#8f9bff',
  'Earth-120703': '#ffda3c',
  'Earth-121698': '#5ec9ff',
  'Earth-26320': '#c17fff',
  'Earth-17315': '#d6d6d6',
  'Earth-703006': '#5effc9',
  'Earth-828': '#ffb45e',
  '1048': '#39ff8f',
  TRN810: '#8f8fff',
  'Nexus of All Realities': '#e6f2ff',
  'Temporal Realm': '#ffffff',
  'Temporal Loom': '#ffffff',
  '': '#8a8a8a',
  'Earth-12041': '#6bd5ff',
  'Earth-92131': '#ff9c3c',
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100
  const light = l / 100
  const a = sat * Math.min(light, 1 - light)
  const channel = (n: number) => {
    const k = (n + h / 30) % 12
    const color = light - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(0)}${channel(8)}${channel(4)}`
}

export function earthColor(base: string): string {
  if (Object.hasOwn(COLOR_OVERRIDES, base)) return COLOR_OVERRIDES[base]!
  let hash = 0
  for (let i = 0; i < base.length; i++) hash = (hash * 31 + base.charCodeAt(i)) >>> 0
  return hslToHex(hash % 360, 70, 62)
}
