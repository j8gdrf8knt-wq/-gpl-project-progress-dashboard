'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { BOQItem, ExpenseEntry } from '@/types'
import { calculateSoftCosts } from '@/lib/computations'
import { fmtBDT, fmtDate } from '@/lib/formatters'

interface ExpenseFormData {
  date: string
  category: string
  description: string
  amount: string
  boqItemId: string
  adminPct: string
  directPct: string
  afterSalePct: string
  contingencyPct: string
  remarks: string
}

export default function ExpenseLogger({
  projectId,
  items,
  isOpen,
  onClose,
  expenses = [],
}: {
  projectId: string
  items: BOQItem[]
  isOpen: boolean
  onClose: () => void
  expenses?: ExpenseEntry[]
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showRecent, setShowRecent] = useState(false)
  const [quickMode, setQuickMode] = useState(false)
  const [form, setForm] = useState<ExpenseFormData>({
    date: new Date().toISOString().slice(0, 10),
    category: '',
    description: '',
    amount: '',
    boqItemId: '',
    adminPct: '2',
    directPct: '2',
    afterSalePct: '0',
    contingencyPct: '3',
    remarks: '',
  })

  const categoryList = Array.from(new Set([...items.map((i) => i.desc), 'Labour', 'Transport', 'Equipment', 'Other']))
  const categoryCounts = categoryList.map(cat => ({
    name: cat,
    count: expenses.filter(e => e.category === cat).length
  })).sort((a, b) => b.count - a.count)

  const amount = parseFloat(form.amount) || 0
  const softCosts =
    amount > 0
      ? calculateSoftCosts(amount, parseFloat(form.adminPct) || 0, parseFloat(form.directPct) || 0, parseFloat(form.afterSalePct) || 0, parseFloat(form.contingencyPct) || 0)
      : { admin: 0, direct: 0, afterSale: 0, contingency: 0 }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.category || !form.description || !form.amount) return

    setIsSubmitting(true)
    try {
      await fetch(`/api/projects/${projectId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          category: form.category,
          description: form.description,
          amount: parseFloat(form.amount),
          boqItemId: form.boqItemId || null,
          adminCost: softCosts.admin,
          directCost: softCosts.direct,
          afterSale: softCosts.afterSale,
          contingency: softCosts.contingency,
          remarks: form.remarks || null,
        }),
      })
      setForm({
        date: new Date().toISOString().slice(0, 10),
        category: '',
        description: '',
        amount: '',
        boqItemId: '',
        adminPct: form.adminPct,
        directPct: form.directPct,
        afterSalePct: form.afterSalePct,
        contingencyPct: form.contingencyPct,
        remarks: '',
      })
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const recentExpenses = expenses.slice(0, 5)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl rounded-2xl border overflow-hidden flex flex-col" style={{ background: 'var(--gpl-card)', borderColor: 'var(--gpl-border)', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--gpl-border)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--gpl-text)' }}>Log Project Expense</h2>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={quickMode} onChange={(e) => setQuickMode(e.target.checked)} className="rounded" />
              <span style={{ color: 'var(--gpl-text2)' }}>Quick Mode</span>
            </label>
            <button onClick={onClose} style={{ color: 'var(--gpl-text2)' }}>✕</button>
          </div>
        </div>

        <div className="overflow-auto flex-1 p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--gpl-text2)' }}>Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full mt-1 rounded border px-2 py-2 text-sm outline-none focus:border-[var(--gpl-blue)]" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }} required />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: 'var(--gpl-text2)' }}>Amount (BDT)</label>
                <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full mt-1 rounded border px-2 py-2 text-sm outline-none focus:border-[var(--gpl-blue)]" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }} required />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--gpl-text2)' }}>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full mt-1 rounded border px-2 py-2 text-sm outline-none focus:border-[var(--gpl-blue)]" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }} required>
                <option value="">Select category...</option>
                {categoryCounts.map((c) => (
                  <option key={c.name} value={c.name}>{c.name} {c.count > 0 && `(${c.count})`}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--gpl-text2)' }}>Description</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full mt-1 rounded border px-2 py-2 text-sm outline-none focus:border-[var(--gpl-blue)]" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }} required />
            </div>

            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--gpl-text2)' }}>BOQ Item (optional)</label>
              <select value={form.boqItemId} onChange={(e) => setForm({ ...form, boqItemId: e.target.value })} className="w-full mt-1 rounded border px-2 py-2 text-sm outline-none focus:border-[var(--gpl-blue)]" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }}>
                <option value="">Not linked to BOQ</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>{`${i.sl}. ${i.desc.slice(0, 40)}`}</option>
                ))}
              </select>
            </div>

            {!quickMode && (
              <div className="border-t pt-4" style={{ borderColor: 'rgba(30,48,80,.4)' }}>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-medium" style={{ color: 'var(--gpl-text2)' }}>Soft Costs</label>
                  <div className="flex gap-2">
                    <button type="button" className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(30,48,80,.3)', color: 'var(--gpl-text2)' }} onClick={() => setForm({ ...form, adminPct: '2', directPct: '2', afterSalePct: '0', contingencyPct: '3' })}>
                      Default
                    </button>
                    <button type="button" className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(30,48,80,.3)', color: 'var(--gpl-text2)' }} onClick={() => setForm({ ...form, adminPct: '3', directPct: '3', afterSalePct: '2', contingencyPct: '5' })}>
                      High Risk
                    </button>
                    <button type="button" className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(30,48,80,.3)', color: 'var(--gpl-text2)' }} onClick={() => setForm({ ...form, adminPct: '1', directPct: '1', afterSalePct: '0', contingencyPct: '2' })}>
                      Low Risk
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(['admin', 'direct', 'afterSale', 'contingency'] as const).map((key) => (
                    <div key={key}>
                      <label className="text-xs" style={{ color: 'var(--gpl-text2)' }}>
                        {key === 'afterSale' ? 'After Sale' : key.charAt(0).toUpperCase() + key.slice(1)} %
                      </label>
                      <input type="number" step="0.1" value={form[`${key}Pct`]} onChange={(e) => setForm({ ...form, [`${key}Pct`]: e.target.value })} className="w-full mt-1 rounded border px-2 py-1 text-xs outline-none focus:border-[var(--gpl-blue)]" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }} />
                      <div className="text-xs mt-1" style={{ color: 'var(--gpl-text2)' }}>{fmtBDT(softCosts[key === 'afterSale' ? 'afterSale' : key])}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-medium" style={{ color: 'var(--gpl-text2)' }}>Remarks (optional)</label>
              <textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} className="w-full mt-1 rounded border px-2 py-2 text-sm outline-none focus:border-[var(--gpl-blue)]" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }} rows={2} />
            </div>

            {showRecent && recentExpenses.length > 0 && (
              <div className="border-t pt-4" style={{ borderColor: 'rgba(30,48,80,.4)' }}>
                <h3 className="text-xs font-medium mb-3" style={{ color: 'var(--gpl-text2)' }}>Recent Expenses (click to use as template)</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {recentExpenses.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setForm({
                        date: e.date.toString().slice(0, 10),
                        category: e.category,
                        description: e.description,
                        amount: e.amount.toString(),
                        boqItemId: e.boqItemId || '',
                        adminPct: form.adminPct,
                        directPct: form.directPct,
                        afterSalePct: form.afterSalePct,
                        contingencyPct: form.contingencyPct,
                        remarks: '',
                      })}
                      className="w-full text-xs p-2 rounded text-left hover:opacity-80 transition-opacity" style={{ background: 'rgba(30,48,80,.3)' }}
                    >
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--gpl-text)' }}>{e.description}</span>
                        <span style={{ color: 'var(--gpl-text2)' }}>{fmtBDT(e.amount)}</span>
                      </div>
                      <div style={{ color: 'var(--gpl-text2)', fontSize: 11 }}>{e.category} • {fmtDate(e.date)}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-center pt-2">
              <button type="button" className="text-xs" style={{ color: 'var(--gpl-blue)' }} onClick={() => setShowRecent(!showRecent)}>
                {showRecent ? '▲ Hide' : '▼ Show'} Recent
              </button>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t" style={{ borderColor: 'rgba(30,48,80,.4)' }}>
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded border" style={{ borderColor: 'var(--gpl-border)', color: 'var(--gpl-text)' }}>
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm rounded font-medium" style={{ background: 'var(--gpl-blue)', color: 'white', opacity: isSubmitting ? 0.6 : 1 }}>
                {isSubmitting ? 'Saving...' : 'Add Expense'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
