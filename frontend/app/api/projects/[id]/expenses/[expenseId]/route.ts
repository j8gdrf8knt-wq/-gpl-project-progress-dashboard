import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const { expenseId } = await params
  const expense = await prisma.expenseEntry.findUnique({
    where: { id: expenseId },
  })

  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }

  return NextResponse.json(expense)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const { expenseId } = await params
  const body = await request.json()

  const expense = await prisma.expenseEntry.update({
    where: { id: expenseId },
    data: {
      date: body.date ? new Date(body.date) : undefined,
      category: body.category,
      description: body.description,
      amount: body.amount,
      boqItemId: body.boqItemId || null,
      adminCost: body.adminCost !== undefined ? body.adminCost : undefined,
      directCost: body.directCost !== undefined ? body.directCost : undefined,
      afterSale: body.afterSale !== undefined ? body.afterSale : undefined,
      contingency: body.contingency !== undefined ? body.contingency : undefined,
      remarks: body.remarks || null,
    },
  })

  return NextResponse.json(expense)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const { expenseId } = await params
  await prisma.expenseEntry.delete({
    where: { id: expenseId },
  })

  return NextResponse.json({ success: true })
}
