import type { Activity, BOQItem, ExpenseEntry, ProgressMetrics, CostMetrics } from '@/types'

export function computeProgress(
  activities: Activity[],
  startDate: string,
  targetDate: string,
  reportDate: string | null,
  importedOverallPct?: number
): ProgressMetrics {
  const today = new Date()
  const target = new Date(targetDate)
  const start = new Date(startDate)

  const pctProjectSum = activities.reduce((s, a) => s + (a.pctProject || 0), 0)
  const totalPct =
    pctProjectSum > 0
      ? pctProjectSum
      : (importedOverallPct ?? 0) > 0
        ? importedOverallPct!
        : activities.length
          ? activities.reduce((s, a) => s + (a.pctTotal || 0), 0) / activities.length
          : 0

  const todayRatePct = activities.reduce((s, a) => s + (a.pctToday || 0), 0)
  const manpowerDeployed = activities.reduce((s, a) => s + (a.personsDay || 0), 0)
  const manpowerRequired = activities.reduce((s, a) => s + (a.reqManpower || 0), 0)

  const daysLeft = Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000))
  const totalDays = Math.ceil((target.getTime() - start.getTime()) / 86400000)
  const daysElapsed = Math.max(0, Math.ceil((today.getTime() - start.getTime()) / 86400000))
  const timePct = totalDays > 0 ? Math.min(100, (daysElapsed / totalDays) * 100) : 0

  const reportMs = new Date(reportDate ?? today).getTime()
  const daysWorked = Math.max(1, Math.round((reportMs - start.getTime()) / 86400000))

  const rptDate = reportDate ?? today.toISOString().slice(0, 10)

  return {
    totalPct: parseFloat(totalPct.toFixed(2)),
    todayRatePct: parseFloat(todayRatePct.toFixed(2)),
    manpowerDeployed,
    manpowerRequired,
    daysLeft,
    daysElapsed,
    totalDays,
    timePct: parseFloat(timePct.toFixed(0)),
    daysWorked,
    reportDate: rptDate,
  }
}

export function computeCosts(items: BOQItem[]): CostMetrics {
  const validItems = items.filter((i) => i.totalPrice > 0)
  const grandTotal = validItems.reduce((s, i) => s + i.totalPrice, 0)
  const grandCost = validItems.reduce((s, i) => s + i.totalCost, 0)
  const grandOffer = validItems.reduce((s, i) => s + i.offerPrice, 0)
  const topItem = validItems.reduce<BOQItem | null>(
    (best, i) => (!best || i.totalPrice > best.totalPrice ? i : best),
    null
  )
  return { grandTotal, grandCost, grandOffer, topItem }
}

export function activityCompletionPct(a: Activity): number {
  return a.qty > 0 ? ((a.totalPresent || 0) / a.qty) * 100 : 0
}

export function badgeColor(pct: number): 'green' | 'amber' | 'red' {
  if (pct >= 60) return 'green'
  if (pct > 0) return 'amber'
  return 'red'
}

export interface ExpenseSummary {
  totalEstimated: number
  totalActual: number
  totalOffer: number
  totalProfit: number
  costUsedPct: number
  costRemaining: number
  costStatus: 'over' | 'warning' | 'on-track'
  byItem: Record<
    string,
    {
      estimated: number
      actual: number
      variance: number
      variancePct: number
    }
  >
}

export function computeExpenseSummary(items: BOQItem[], expenses: ExpenseEntry[]): ExpenseSummary {
  const totalEstimated = items.reduce((sum, i) => sum + i.totalCost, 0)
  const totalOffer = items.reduce((sum, i) => sum + i.offerPrice, 0)
  const totalActual = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalProfit = totalOffer - totalEstimated

  const costUsedPct = totalEstimated > 0 ? (totalActual / totalEstimated) * 100 : 0
  const costRemaining = totalEstimated - totalActual

  let costStatus: 'over' | 'warning' | 'on-track' = 'on-track'
  if (costUsedPct > 100) costStatus = 'over'
  else if (costUsedPct > 80) costStatus = 'warning'

  const byItem: Record<
    string,
    {
      estimated: number
      actual: number
      variance: number
      variancePct: number
    }
  > = {}

  items.forEach((item) => {
    const itemExpenses = expenses
      .filter((e) => e.boqItemId === item.id)
      .reduce((sum, e) => sum + e.amount, 0)

    const variance = itemExpenses - item.totalCost
    const variancePct = item.totalCost > 0 ? (variance / item.totalCost) * 100 : 0

    byItem[item.id] = {
      estimated: item.totalCost,
      actual: itemExpenses,
      variance,
      variancePct: parseFloat(variancePct.toFixed(2)),
    }
  })

  return {
    totalEstimated,
    totalActual,
    totalOffer,
    totalProfit,
    costUsedPct: parseFloat(costUsedPct.toFixed(2)),
    costRemaining,
    costStatus,
    byItem,
  }
}

export function calculateSoftCosts(
  amount: number,
  adminPct: number,
  directPct: number,
  afterSalePct: number,
  contingencyPct: number
) {
  return {
    admin: parseFloat(((amount * adminPct) / 100).toFixed(2)),
    direct: parseFloat(((amount * directPct) / 100).toFixed(2)),
    afterSale: parseFloat(((amount * afterSalePct) / 100).toFixed(2)),
    contingency: parseFloat(((amount * contingencyPct) / 100).toFixed(2)),
  }
}
