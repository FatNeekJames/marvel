export type ReleaseQueueItem = Readonly<{
  key: string
  title: string
  tag: 'UPCOMING' | 'RELEASED' | ''
  match: string
}>

export const DEFAULT_RELEASE_QUEUE: readonly ReleaseQueueItem[] = [
  { key: 'ironheart', title: 'Iron Heart', tag: 'UPCOMING', match: 'ironheart' },
  { key: 'wonderman', title: 'Wonder-Man', tag: 'UPCOMING', match: 'wonder-man' },
  { key: 'spidernoir', title: 'Spider-Noir', tag: 'RELEASED', match: '' },
  { key: 'ddba2', title: 'Daredevil: Born Again S2', tag: 'UPCOMING', match: 'born again' },
  { key: 'punolk', title: 'The Punisher: One Last Kill', tag: 'RELEASED', match: 'one last kill' },
  { key: 'xm97', title: "X-Men '97", tag: 'RELEASED', match: "x-men '97" },
  { key: 'smbnd', title: 'Spider-Man: Brand New Day', tag: 'UPCOMING', match: 'brand new day' },
  { key: 'visionq', title: 'Vision Quest', tag: 'UPCOMING', match: '' },
  { key: 'fnsm2', title: 'Spider-Man: FNSM S2', tag: 'UPCOMING', match: '' },
  { key: 'doomsday', title: 'Avengers: Doomsday', tag: 'UPCOMING', match: 'doomsday' },
  { key: 'secretwars', title: 'Secret Wars', tag: 'UPCOMING', match: '' },
  { key: 'ghostrider', title: 'Ghost Rider', tag: 'UPCOMING', match: '' },
  { key: 'xmen', title: 'X-Men', tag: 'UPCOMING', match: '' },
  { key: 'gr2007', title: 'Ghost Rider (2007)', tag: 'RELEASED', match: '' },
]

export const UNIVERSES = [
  {
    key: 'marvel',
    name: 'MARVEL MAIN',
    tag: 'TVA // MULTIVERSAL LOOM',
    pending: false,
    swatch: '#ffd24a',
  },
  { key: 'dc', name: 'DC UNIVERSE', tag: 'THE DC MULTIVERSE', pending: true, swatch: '#39c7ff' },
  {
    key: 'starwars',
    name: 'STAR WARS',
    tag: 'A GALAXY FAR, FAR AWAY',
    pending: true,
    swatch: '#ff5b7f',
  },
  {
    key: 'marvelcomics',
    name: 'MARVEL COMICS',
    tag: 'EARTH-616 — CLASSIC',
    pending: true,
    swatch: '#ff3b3b',
  },
  { key: 'doctorwho', name: 'DOCTOR WHO', tag: 'THE WHONIVERSE', pending: true, swatch: '#8f9bff' },
] as const

export const DATASET_TABS = [
  { key: 'main', label: 'TIMELINE' },
  { key: '90s', label: "90'S SHOWS" },
  { key: '2010s', label: '2010S SHOWS' },
  { key: 'universe-keys', label: 'UNIVERSE KEY' },
] as const
