import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const searchParams = request.nextUrl.searchParams

  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const category = searchParams.get('category')
  const boqItemId = searchParams.get('boqItemId')

  const where: any = { projectId }

  if (startDate || endDate) {
    where.date = {}
    if (startDate) where.date.gte = new Date(startDate)
    if (endDate) where.date.lte = new Date(endDate)
  }

  if (category) where.category = category
  if (boqItemId) where.boqItemId = boqItemId

  const expenses = await prisma.expenseEntry.findMany({
    where,
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(expenses)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const body = await request.json()

  const expense = await prisma.expenseEntry.create({
    data: {
      projectId,
      date: new Date(body.date),
      category: body.category,
      description: body.description,
      amount: body.amount,
      boqItemId: body.boqItemId || null,
      adminCost: body.adminCost || 0,
      directCost: body.directCost || 0,
      afterSale: body.afterSale || 0,
      contingency: body.contingency || 0,
      remarks: body.remarks || null,
    },
  })

  return NextResponse.json(expense, { status: 201 })
}
