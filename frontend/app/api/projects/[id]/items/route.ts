import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const items = await prisma.boqItem.findMany({
    where: { projectId: id },
    orderBy: { sl: 'asc' },
  })
  return NextResponse.json(items)
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const items: Array<Record<string, unknown>> = await req.json()

  await prisma.$transaction([
    prisma.boqItem.deleteMany({ where: { projectId: id } }),
    prisma.boqItem.createMany({
      data: items.map((item, i) => ({
        projectId: id,
        sl: Number(item.sl ?? i + 1),
        desc: String(item.desc ?? ''),
        qty: Number(item.qty ?? 0),
        unit: String(item.unit ?? ''),
        unitPrice: Number(item.unitPrice ?? 0),
        totalPrice: Number(item.totalPrice ?? 0),
        totalCost: Number(item.totalCost ?? 0),
        offerPrice: Number(item.offerPrice ?? 0),
      })),
    }),
  ])

  const updated = await prisma.boqItem.findMany({
    where: { projectId: id },
    orderBy: { sl: 'asc' },
  })
  return NextResponse.json(updated)
}
