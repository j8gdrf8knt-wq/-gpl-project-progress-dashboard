import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params
  const body = await request.json()

  const expenses = body.expenses || []

  if (!Array.isArray(expenses) || expenses.length === 0) {
    return NextResponse.json(
      { error: 'Expected array of expenses' },
      { status: 400 }
    )
  }

  const results = await Promise.allSettled(
    expenses.map(exp =>
      prisma.expenseEntry.create({
        data: {
          projectId,
          date: new Date(exp.date),
          category: exp.category,
          description: exp.description,
          amount: exp.amount,
          boqItemId: exp.boqItemId || null,
          adminCost: exp.adminCost || 0,
          directCost: exp.directCost || 0,
          afterSale: exp.afterSale || 0,
          contingency: exp.contingency || 0,
          remarks: exp.remarks || null,
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
    total: expenses.length,
  }, { status: 201 })
}
