import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const project = await prisma.project.findUnique({
    where: { id },
    include: { activities: { orderBy: { order: 'asc' } }, items: { orderBy: { sl: 'asc' } } },
  })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const project = await prisma.project.update({
    where: { id },
    data: {
      name: body.name,
      client: body.client ?? null,
      subtitle: body.subtitle ?? null,
      startDate: new Date(body.startDate),
      targetDate: new Date(body.targetDate),
      reportDate: body.reportDate ? new Date(body.reportDate) : null,
    },
  })
  return NextResponse.json(project)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(body.estimatedCost !== undefined && { estimatedCost: body.estimatedCost }),
    },
  })
  return NextResponse.json(project)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.project.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
