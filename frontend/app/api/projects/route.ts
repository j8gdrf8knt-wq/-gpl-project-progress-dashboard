import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { activities: true, items: true } } },
  })
  return NextResponse.json(projects)
}

export async function POST(req: Request) {
  const body = await req.json()
  const project = await prisma.project.create({
    data: {
      name: body.name,
      client: body.client ?? null,
      subtitle: body.subtitle ?? null,
      startDate: new Date(body.startDate),
      targetDate: new Date(body.targetDate),
      reportDate: body.reportDate ? new Date(body.reportDate) : null,
    },
  })
  return NextResponse.json(project, { status: 201 })
}
