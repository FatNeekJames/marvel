import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTimelineRepository } from '@/lib/repositories'

const querySchema = z.object({
  dataset: z.string().max(32).default('main'),
  reality: z.string().max(100).optional(),
  search: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(500),
})

export async function GET(request: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Invalid query', issues: parsed.error.issues },
      { status: 400 },
    )
  const timelineRepository = getTimelineRepository()
  const entries = await timelineRepository.find(parsed.data)
  return NextResponse.json({ entries }, { headers: { 'Cache-Control': 'private, max-age=30' } })
}
