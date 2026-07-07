import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const body = await request.json()

  const activities = body.activities || []

  if (!Array.isArray(activities) || activities.length === 0) {
    return NextResponse.json(
      { error: 'Expected array of activities' },
      { status: 400 }
    )
  }

  // Get the highest existing order number
  const maxOrder = await prisma.activity.aggregate({
    where: { projectId },
    _max: { order: true },
  })
  const startOrder = (maxOrder._max.order ?? -1) + 1

  const results = await Promise.allSettled(
    activities.map((act, idx) =>
      prisma.activity.create({
        data: {
          projectId,
          name: String(act.name ?? '').trim(),
          qty: Number(act.qty ?? 0),
          unit: String(act.unit ?? '').trim(),
          todayAchiev: Number(act.todayAchiev ?? 0),
          pctToday: Number(act.pctToday ?? 0),
          totalPresent: Number(act.totalPresent ?? 0),
          pctTotal: Number(act.pctTotal ?? 0),
          pctProject: Number(act.pctProject ?? 0),
          targetDate: act.targetDate ? new Date(String(act.targetDate)) : null,
          availDays: Number(act.availDays ?? 0),
          reqRate: Number(act.reqRate ?? 0),
          reqManpower: Number(act.reqManpower ?? 0),
          personsDay: Number(act.personsDay ?? 0),
          highlighted: Boolean(act.highlighted ?? false),
          order: startOrder + idx,
        },
      })
    )
  )

  const created = results.filter(r => r.status === 'fulfilled').length
  const errors = results
    .map((r, idx) => r.status === 'rejected' ? { row: idx + 1, message: r.reason?.message || 'Unknown error' } : null)
    .filter(Boolean)

  return NextResponse.json({
    created,
    errors,
    total: activities.length,
  }, { status: 201 })
}
