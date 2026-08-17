export type TimelineEntry = Readonly<{ id: string; legacyKey: string; dataset: string; title: string; universe: string; reality: string; note: string | null; season: string | null; episodes: string | null; period: string | null; yearStart: number | null; yearEnd: number | null }>;
export type TimelineQuery = Readonly<{ dataset?: string; reality?: string; search?: string; limit?: number }>;

export const normalizeQuery = (query: TimelineQuery): Required<TimelineQuery> => ({
  dataset: query.dataset?.trim().slice(0, 32) || 'main',
  reality: query.reality?.trim().slice(0, 100) || '',
  search: query.search?.trim().slice(0, 120) || '',
  limit: Math.min(Math.max(query.limit ?? 500, 1), 500)
});
