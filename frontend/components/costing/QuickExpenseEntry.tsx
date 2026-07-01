'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BOQItem } from '@/types'

export default function QuickExpenseEntry({
  projectId,
  items,
  categories,
  onExpenseAdded,
}: {
  projectId: string
  items: BOQItem[]
  categories: string[]
  onExpenseAdded: () => void
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    category: '',
    description: '',
    boqItemId: '',
    adminPct: '2',
    directPct: '2',
    afterSalePct: '0',
    contingencyPct: '3',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.category || !form.description || !form.amount) return

    setIsSubmitting(true)
    try {
      const adminCost = (parseFloat(form.amount) * parseFloat(form.adminPct)) / 100 || 0
      const directCost = (parseFloat(form.amount) * parseFloat(form.directPct)) / 100 || 0
      const afterSale = (parseFloat(form.amount) * parseFloat(form.afterSalePct)) / 100 || 0
      const contingency = (parseFloat(form.amount) * parseFloat(form.contingencyPct)) / 100 || 0

      await fetch(`/api/projects/${projectId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: form.date,
          category: form.category,
          description: form.description,
          amount: parseFloat(form.amount),
          boqItemId: form.boqItemId || null,
          adminCost,
          directCost,
          afterSale,
          contingency,
          remarks: null,
        }),
      })

      setForm({
        date: new Date().toISOString().slice(0, 10),
        amount: '',
        category: '',
        description: '',
        boqItemId: '',
        adminPct: '2',
        directPct: '2',
        afterSalePct: '0',
        contingencyPct: '3',
      })
      router.refresh()
      onExpenseAdded()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-b rounded-t-lg" style={{ background: 'rgba(30,48,80,.3)', borderColor: 'var(--gpl-border)' }}>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--gpl-text2)' }}>Date</label>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded border px-2 py-2 text-xs outline-none focus:border-[var(--gpl-blue)]" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }} required />
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--gpl-text2)' }}>Amount</label>
          <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full rounded border px-2 py-2 text-xs outline-none focus:border-[var(--gpl-blue)]" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }} required />
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--gpl-text2)' }}>Category</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded border px-2 py-2 text-xs outline-none focus:border-[var(--gpl-blue)]" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }} required>
            <option value="">Select...</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--gpl-text2)' }}>Description</label>
          <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded border px-2 py-2 text-xs outline-none focus:border-[var(--gpl-blue)]" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }} required />
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={isSubmitting} className="flex-1 px-3 py-2 text-xs rounded font-medium" style={{ background: 'var(--gpl-blue)', color: 'white', opacity: isSubmitting ? 0.6 : 1 }}>
            {isSubmitting ? 'Adding...' : 'Add'}
          </button>
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="px-3 py-2 text-xs rounded" style={{ background: 'transparent', border: `1px solid var(--gpl-border)`, color: 'var(--gpl-text2)' }}>
            {showAdvanced ? '▲' : '▼'} Options
          </button>
        </div>
      </div>

      {showAdvanced && (
        <div className="mt-3 pt-3 border-t grid grid-cols-2 md:grid-cols-5 gap-3" style={{ borderColor: 'var(--gpl-border)' }}>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--gpl-text2)' }}>BOQ Item</label>
            <select value={form.boqItemId} onChange={(e) => setForm({ ...form, boqItemId: e.target.value })} className="w-full rounded border px-2 py-2 text-xs outline-none focus:border-[var(--gpl-blue)]" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }}>
              <option value="">Not linked</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.desc.slice(0, 20)}</option>
              ))}
            </select>
          </div>

          {(['admin', 'direct', 'afterSale', 'contingency'] as const).map((key) => (
            <div key={key}>
              <label className="text-xs font-medium block mb-1" style={{ color: 'var(--gpl-text2)' }}>
                {key === 'afterSale' ? 'After Sale %' : `${key.charAt(0).toUpperCase() + key.slice(1)} %`}
              </label>
              <input type="number" step="0.1" value={form[`${key}Pct`]} onChange={(e) => setForm({ ...form, [`${key}Pct`]: e.target.value })} className="w-full rounded border px-2 py-2 text-xs outline-none focus:border-[var(--gpl-blue)]" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }} />
            </div>
          ))}
        </div>
      )}
    </form>
  )
}
