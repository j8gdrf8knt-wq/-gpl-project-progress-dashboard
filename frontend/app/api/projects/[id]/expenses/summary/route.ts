import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ExpenseEntry } from '@/types'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params

  const expenses = await prisma.expenseEntry.findMany({
    where: { projectId },
  })

  const items = await prisma.boQItem.findMany({
    where: { projectId },
  })

  const totalExpense = expenses.reduce((sum: number, e: any) => sum + e.amount, 0)
  const totalSoftCosts = {
    admin: expenses.reduce((sum: number, e: any) => sum + (e.adminCost || 0), 0),
    direct: expenses.reduce((sum: number, e: any) => sum + (e.directCost || 0), 0),
    afterSale: expenses.reduce((sum: number, e: any) => sum + (e.afterSale || 0), 0),
    contingency: expenses.reduce((sum: number, e: any) => sum + (e.contingency || 0), 0),
  }

  const byCategory: Record<string, number> = {}
  expenses.forEach((e: any) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
  })

  const byBoqItem: Record<string, { estimated: number; actual: number; variance: number }> = {}
  items.forEach((item: any) => {
    byBoqItem[item.id] = {
      estimated: item.totalCost,
      actual: 0,
      variance: 0,
    }
  })

  expenses.forEach((e: any) => {
    if (e.boqItemId && byBoqItem[e.boqItemId]) {
      byBoqItem[e.boqItemId].actual += e.amount
    }
  })

  Object.keys(byBoqItem).forEach((itemId: string) => {
    byBoqItem[itemId].variance = byBoqItem[itemId].actual - byBoqItem[itemId].estimated
  })

  const estimatedTotal = items.reduce((sum: number, item: any) => sum + item.totalCost, 0)
  const offerTotal = items.reduce((sum: number, item: any) => sum + item.offerPrice, 0)

  return NextResponse.json({
    totalExpense,
    estimatedTotal,
    offerTotal,
    totalProfit: offerTotal - estimatedTotal,
    costUsedPct: estimatedTotal > 0 ? (totalExpense / estimatedTotal) * 100 : 0,
    costRemaining: estimatedTotal - totalExpense,
    byCategory,
    byBoqItem,
    softCosts: totalSoftCosts,
  })
}
