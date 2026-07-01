import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { computeCosts, computeExpenseSummary } from '@/lib/computations'
import { fmtBDT } from '@/lib/formatters'
import Topbar from '@/components/layout/Topbar'
import ViewTabs from '@/components/layout/ViewTabs'
import CostBarChart from '@/components/costing/CostBarChart'
import CostDonut from '@/components/costing/CostDonut'
import PriceCompChart from '@/components/costing/PriceCompChart'
import BOQTable from '@/components/costing/BOQTable'
import ExcelDropZone from '@/components/costing/ExcelDropZone'
import CostingPageClient from '@/components/costing/CostingPageClient'
import EditableEstimatedCost from '@/components/costing/EditableEstimatedCost'
import type { BOQItem, ExpenseEntry } from '@/types'

export const dynamic = 'force-dynamic'

function serializeItem(i: {
  id: string; projectId: string; sl: number; desc: string; qty: number; unit: string;
  unitPrice: number; totalPrice: number; totalCost: number; offerPrice: number;
}): BOQItem {
  return { ...i }
}

export default async function CostingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [project, allProjects, expenses] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: { items: { orderBy: { sl: 'asc' } } },
    }),
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { createdAt: 'desc' } }),
    prisma.expenseEntry.findMany({
      where: { projectId: id },
      orderBy: { date: 'desc' },
    }),
  ])

  if (!project) notFound()

  const items = project.items.map(serializeItem)
  const costs = computeCosts(items)

  const serializedExpenses = expenses.map((e: any) => ({
    ...e,
    date: e.date.toISOString().slice(0, 10),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  })) as ExpenseEntry[]

  const expenseSummary = computeExpenseSummary(items, serializedExpenses)

  const serializedProject = {
    ...project,
    startDate: project.startDate.toISOString().slice(0, 10),
    targetDate: project.targetDate.toISOString().slice(0, 10),
    reportDate: project.reportDate?.toISOString().slice(0, 10) ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    activities: [],
    items,
  }

  const kpiCards = [
    { label: 'Current Total Expense', value: `৳ ${fmtBDT(expenseSummary.totalActual)}`, color: 'var(--gpl-amber)' },
    { label: 'Cost Used', value: `${expenseSummary.costUsedPct.toFixed(1)}%`, color: expenseSummary.costStatus === 'over' ? 'var(--gpl-red)' : expenseSummary.costStatus === 'warning' ? 'var(--gpl-amber)' : 'var(--gpl-green)' },
    { label: 'Cost Remaining', value: expenseSummary.costRemaining >= 0 ? `৳ ${fmtBDT(expenseSummary.costRemaining)}` : `৳ -${fmtBDT(Math.abs(expenseSummary.costRemaining))}`, color: expenseSummary.costRemaining >= 0 ? 'var(--gpl-green)' : 'var(--gpl-red)' },
    { label: 'Total Profit', value: `৳ ${fmtBDT(expenseSummary.totalProfit)}`, color: 'var(--gpl-green)' },
  ]

  return (
    <div>
      <Topbar project={serializedProject} projects={allProjects} view="costing" />
      <ViewTabs projectId={id} active="costing" />

      <main className="px-6 py-6 flex flex-col gap-5 max-w-[1600px] mx-auto">
        {/* Excel Import Drop Zone */}
        <div className="px-6 -mx-6 bg-[rgba(255,255,255,.015)] py-4 -mt-6 mb-2">
          <div className="px-6">
            <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--gpl-text2)' }}>Import Expenses</div>
            <ExcelDropZone projectId={id} />
          </div>
        </div>
        {/* KPI Cards */}
        <div className="grid grid-cols-5 gap-3">
          <EditableEstimatedCost projectId={id} initialValue={expenseSummary.totalEstimated} />
          {kpiCards.map((c) => (
            <div
              key={c.label}
              className="rounded-2xl border relative overflow-hidden p-4"
              style={{ background: 'var(--gpl-card)', borderColor: 'var(--gpl-border)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: c.color }} />
              <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--gpl-text2)' }}>{c.label}</div>
              <div className="text-xl font-bold leading-none truncate" style={{ color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1 rounded-2xl border overflow-hidden" style={{ background: 'var(--gpl-card)', borderColor: 'var(--gpl-border)' }}>
            <div className="px-4 py-3 border-b text-xs font-bold uppercase tracking-widest" style={{ borderColor: 'var(--gpl-border)', color: 'var(--gpl-text2)', background: 'rgba(255,255,255,.015)' }}>Cost Share (Top 5)</div>
            <div className="p-4 flex justify-center"><CostDonut items={items} grandTotal={costs.grandTotal} /></div>
          </div>
          <div className="col-span-2 rounded-2xl border overflow-hidden" style={{ background: 'var(--gpl-card)', borderColor: 'var(--gpl-border)' }}>
            <div className="px-4 py-3 border-b text-xs font-bold uppercase tracking-widest" style={{ borderColor: 'var(--gpl-border)', color: 'var(--gpl-text2)', background: 'rgba(255,255,255,.015)' }}>Total Price by Item (Top 8)</div>
            <div className="p-4"><CostBarChart items={items} /></div>
          </div>
        </div>

        {/* Price comparison chart */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--gpl-card)', borderColor: 'var(--gpl-border)' }}>
          <div className="px-4 py-3 border-b text-xs font-bold uppercase tracking-widest" style={{ borderColor: 'var(--gpl-border)', color: 'var(--gpl-text2)', background: 'rgba(255,255,255,.015)' }}>Price Comparison — Total vs Cost vs Offer (Top 8)</div>
          <div className="p-4"><PriceCompChart items={items} /></div>
        </div>

        {/* BOQ Table */}
        <BOQTable items={items} projectId={id} grandTotal={costs.grandTotal} />

        {/* Expenses Section */}
        <CostingPageClient projectId={id} items={items} expenses={serializedExpenses} />
      </main>
    </div>
  )
}
