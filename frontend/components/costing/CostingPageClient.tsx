'use client'
import { useState, useMemo } from 'react'
import type { BOQItem, ExpenseEntry } from '@/types'
import ExpenseLogger from './ExpenseLogger'
import QuickExpenseEntry from './QuickExpenseEntry'
import BulkExpenseLogger from './BulkExpenseLogger'
import BulkExpensesPaster from './BulkExpensesPaster'
import ExpensesTable from './ExpensesTable'

type InputMode = 'quick' | 'single' | 'bulk'

export default function CostingPageClient({
  projectId,
  items,
  expenses,
}: {
  projectId: string
  items: BOQItem[]
  expenses: ExpenseEntry[]
}) {
  const [inputMode, setInputMode] = useState<InputMode>('single')
  const [isLoggerOpen, setIsLoggerOpen] = useState(false)
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const categories = useMemo(() => {
    const unique = Array.from(new Set([...items.map((i) => i.desc), 'Labour', 'Transport', 'Equipment', 'Other']))
    return unique.sort()
  }, [items])

  return (
    <>
      {/* Expenses Section */}
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--gpl-card)', borderColor: 'var(--gpl-border)' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--gpl-border)', background: 'rgba(255,255,255,.015)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gpl-text2)' }}>Expense Logger ({expenses.length} entries)</div>
            <BulkExpensesPaster projectId={projectId} onSuccess={() => setRefreshKey(k => k + 1)} />
          </div>

          {/* Input Mode Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setInputMode('quick')}
              className="px-3 py-2 text-xs rounded font-medium transition-all"
              style={{
                background: inputMode === 'quick' ? 'var(--gpl-blue)' : 'transparent',
                color: inputMode === 'quick' ? 'white' : 'var(--gpl-text2)',
                border: inputMode === 'quick' ? 'none' : `1px solid var(--gpl-border)`,
              }}
            >
              Quick Add
            </button>
            <button
              onClick={() => setInputMode('single')}
              className="px-3 py-2 text-xs rounded font-medium transition-all"
              style={{
                background: inputMode === 'single' ? 'var(--gpl-blue)' : 'transparent',
                color: inputMode === 'single' ? 'white' : 'var(--gpl-text2)',
                border: inputMode === 'single' ? 'none' : `1px solid var(--gpl-border)`,
              }}
            >
              Single Entry
            </button>
            <button
              onClick={() => setInputMode('bulk')}
              className="px-3 py-2 text-xs rounded font-medium transition-all"
              style={{
                background: inputMode === 'bulk' ? 'var(--gpl-blue)' : 'transparent',
                color: inputMode === 'bulk' ? 'white' : 'var(--gpl-text2)',
                border: inputMode === 'bulk' ? 'none' : `1px solid var(--gpl-border)`,
              }}
            >
              Bulk Entry
            </button>
          </div>
        </div>

        {/* Quick Add Mode */}
        {inputMode === 'quick' && (
          <QuickExpenseEntry
            projectId={projectId}
            items={items}
            categories={categories}
            onExpenseAdded={() => {}}
          />
        )}

        {/* Single Entry Modal Button */}
        {inputMode === 'single' && (
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--gpl-border)' }}>
            <button
              onClick={() => setIsLoggerOpen(true)}
              className="px-4 py-2 text-xs font-medium rounded"
              style={{ background: 'var(--gpl-blue)', color: 'white' }}
            >
              + Open Form
            </button>
          </div>
        )}

        {/* Bulk Entry Modal Button */}
        {inputMode === 'bulk' && (
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--gpl-border)' }}>
            <button
              onClick={() => setIsBulkOpen(true)}
              className="px-4 py-2 text-xs font-medium rounded"
              style={{ background: 'var(--gpl-blue)', color: 'white' }}
            >
              + Open Bulk Entry
            </button>
          </div>
        )}

        {/* Expense Table */}
        <div className="p-4">
          <ExpensesTable expenses={expenses} />
        </div>
      </div>

      {/* Modals */}
      <ExpenseLogger projectId={projectId} items={items} isOpen={isLoggerOpen} onClose={() => setIsLoggerOpen(false)} expenses={expenses} />
      <BulkExpenseLogger projectId={projectId} items={items} categories={categories} isOpen={isBulkOpen} onClose={() => setIsBulkOpen(false)} />
    </>
  )
}
