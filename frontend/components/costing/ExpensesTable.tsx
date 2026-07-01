'use client'
import { useState, useMemo } from 'react'
import type { ExpenseEntry } from '@/types'
import { fmtBDT, fmtDate } from '@/lib/formatters'

type DateFilter = 'all' | '7days' | '30days'

export default function ExpensesTable({
  expenses = [],
  isLoading = false,
  defaultExpanded = true,
}: {
  expenses: ExpenseEntry[]
  isLoading?: boolean
  defaultExpanded?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')

  const filteredExpenses = useMemo(() => {
    if (dateFilter === 'all') return expenses

    const now = new Date()
    const cutoffDays = dateFilter === '7days' ? 7 : 30
    const cutoffDate = new Date(now.getTime() - cutoffDays * 24 * 60 * 60 * 1000)

    return expenses.filter(exp => new Date(exp.date) >= cutoffDate)
  }, [expenses, dateFilter])

  if (isLoading) {
    return (
      <div className="text-center py-8" style={{ color: 'var(--gpl-text2)' }}>
        Loading expenses...
      </div>
    )
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-8" style={{ color: 'var(--gpl-text2)' }}>
        No expenses logged yet
      </div>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--gpl-border)' }}>
      {/* Header with toggle and filters */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: 'rgba(30,48,80,.5)' }}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity"
          style={{ color: 'var(--gpl-blue)' }}
        >
          <span>{isExpanded ? '▼' : '▶'}</span>
          <span>Expense History ({filteredExpenses.length})</span>
        </button>

        {/* Filter controls */}
        <div className="flex gap-2">
          <button
            onClick={() => setDateFilter('7days')}
            className="px-3 py-1 text-xs rounded font-medium transition-all"
            style={{
              background: dateFilter === '7days' ? 'var(--gpl-blue)' : 'transparent',
              color: dateFilter === '7days' ? 'white' : 'var(--gpl-text2)',
              border: dateFilter === '7days' ? 'none' : `1px solid var(--gpl-border)`,
            }}
          >
            Last 7 days
          </button>
          <button
            onClick={() => setDateFilter('30days')}
            className="px-3 py-1 text-xs rounded font-medium transition-all"
            style={{
              background: dateFilter === '30days' ? 'var(--gpl-blue)' : 'transparent',
              color: dateFilter === '30days' ? 'white' : 'var(--gpl-text2)',
              border: dateFilter === '30days' ? 'none' : `1px solid var(--gpl-border)`,
            }}
          >
            Last 30 days
          </button>
          <button
            onClick={() => setDateFilter('all')}
            className="px-3 py-1 text-xs rounded font-medium transition-all"
            style={{
              background: dateFilter === 'all' ? 'var(--gpl-blue)' : 'transparent',
              color: dateFilter === 'all' ? 'white' : 'var(--gpl-text2)',
              border: dateFilter === 'all' ? 'none' : `1px solid var(--gpl-border)`,
            }}
          >
            All
          </button>
        </div>
      </div>

      {/* Collapsible table */}
      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: 600 }}>
            <thead>
              <tr style={{ borderColor: 'var(--gpl-border)' }} className="border-b">
                <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--gpl-text2)' }}>Date</th>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--gpl-text2)' }}>Category</th>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--gpl-text2)' }}>Description</th>
                <th className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--gpl-text2)' }}>Amount</th>
                <th className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--gpl-text2)' }}>Soft Costs</th>
                <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--gpl-text2)' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="border-t" style={{ borderColor: 'rgba(30,48,80,.4)' }}>
                  <td className="px-3 py-2" style={{ color: 'var(--gpl-text)' }}>{fmtDate(expense.date)}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--gpl-text)' }}>{expense.category}</td>
                  <td className="px-3 py-2" style={{ color: 'var(--gpl-text)' }}>{expense.description}</td>
                  <td className="px-3 py-2 text-right font-medium" style={{ color: 'var(--gpl-text)' }}>{fmtBDT(expense.amount)}</td>
                  <td className="px-3 py-2 text-right text-xs" style={{ color: 'var(--gpl-text2)' }}>
                    {expense.adminCost || 0 > 0 ? `+${fmtBDT((expense.adminCost || 0) + (expense.directCost || 0) + (expense.afterSale || 0) + (expense.contingency || 0))}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs truncate" style={{ color: 'var(--gpl-text2)' }}>{expense.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
