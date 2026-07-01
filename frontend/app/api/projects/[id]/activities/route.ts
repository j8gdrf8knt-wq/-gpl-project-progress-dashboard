import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const activities = await prisma.activity.findMany({
    where: { projectId: id },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(activities)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const activities: Array<Record<string, unknown>> = await req.json()

  await prisma.$transaction([
    prisma.activity.deleteMany({ where: { projectId: id } }),
    prisma.activity.createMany({
      data: activities.map((a, i) => ({
        projectId: id,
        name: String(a.name ?? ''),
        qty: Number(a.qty ?? 0),
        unit: String(a.unit ?? ''),
        todayAchiev: Number(a.todayAchiev ?? 0),
        pctToday: Number(a.pctToday ?? 0),
        totalPresent: Number(a.totalPresent ?? 0),
        pctTotal: Number(a.pctTotal ?? 0),
        pctProject: Number(a.pctProject ?? 0),
        targetDate: a.targetDate ? new Date(String(a.targetDate)) : null,
        availDays: Number(a.availDays ?? 0),
        reqRate: Number(a.reqRate ?? 0),
        reqManpower: Number(a.reqManpower ?? 0),
        personsDay: Number(a.personsDay ?? 0),
        highlighted: Boolean(a.highlighted ?? false),
        order: i,
      })),
    }),
  ])

  const updated = await prisma.activity.findMany({
    where: { projectId: id },
    orderBy: { order: 'asc' },
  })
  return NextResponse.json(updated)
}
