'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BOQItem } from '@/types'
import { fmtBDT } from '@/lib/formatters'

interface BulkExpenseRow {
  date: string
  amount: string
  category: string
  description: string
  boqItemId: string
  adminPct: string
  directPct: string
  afterSalePct: string
  contingencyPct: string
  remarks: string
}

export default function BulkExpenseLogger({
  projectId,
  items,
  categories,
  isOpen,
  onClose,
}: {
  projectId: string
  items: BOQItem[]
  categories: string[]
  isOpen: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rows, setRows] = useState<BulkExpenseRow[]>(
    Array(5).fill(null).map(() => ({
      date: new Date().toISOString().slice(0, 10),
      amount: '',
      category: '',
      description: '',
      boqItemId: '',
      adminPct: '2',
      directPct: '2',
      afterSalePct: '0',
      contingencyPct: '3',
      remarks: '',
    }))
  )

  function updateRow(idx: number, field: keyof BulkExpenseRow, value: string) {
    const newRows = [...rows]
    newRows[idx] = { ...newRows[idx], [field]: value }
    setRows(newRows)
  }

  function addRow() {
    setRows([...rows, {
      date: new Date().toISOString().slice(0, 10),
      amount: '',
      category: '',
      description: '',
      boqItemId: '',
      adminPct: rows[0]?.adminPct || '2',
      directPct: rows[0]?.directPct || '2',
      afterSalePct: rows[0]?.afterSalePct || '0',
      contingencyPct: rows[0]?.contingencyPct || '3',
      remarks: '',
    }])
  }

  function removeRow(idx: number) {
    setRows(rows.filter((_, i) => i !== idx))
  }

  function fillSoftCostsDown(field: keyof BulkExpenseRow) {
    const value = rows[0]?.[field]
    if (!value) return
    const newRows = rows.map((row, idx) => idx === 0 ? row : { ...row, [field]: value })
    setRows(newRows)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validRows = rows.filter(r => r.category && r.description && r.amount)
    if (validRows.length === 0) return

    setIsSubmitting(true)
    try {
      const expenses = validRows.map(row => ({
        date: row.date,
        amount: parseFloat(row.amount),
        category: row.category,
        description: row.description,
        boqItemId: row.boqItemId || null,
        adminCost: (parseFloat(row.amount) * parseFloat(row.adminPct)) / 100 || 0,
        directCost: (parseFloat(row.amount) * parseFloat(row.directPct)) / 100 || 0,
        afterSale: (parseFloat(row.amount) * parseFloat(row.afterSalePct)) / 100 || 0,
        contingency: (parseFloat(row.amount) * parseFloat(row.contingencyPct)) / 100 || 0,
        remarks: row.remarks || null,
      }))

      await fetch(`/api/projects/${projectId}/expenses/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses }),
      })

      router.refresh()
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-7xl rounded-2xl border overflow-hidden flex flex-col" style={{ background: 'var(--gpl-card)', borderColor: 'var(--gpl-border)', maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--gpl-border)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--gpl-text)' }}>Bulk Expense Entry</h2>
          <button onClick={onClose} style={{ color: 'var(--gpl-text2)' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr style={{ borderColor: 'var(--gpl-border)' }} className="border-b sticky top-0" style={{ background: 'rgba(30,48,80,.3)' }}>
                    <th className="px-2 py-2 text-left font-semibold" style={{ color: 'var(--gpl-text2)' }}>Date</th>
                    <th className="px-2 py-2 text-right font-semibold" style={{ color: 'var(--gpl-text2)' }}>Amount</th>
                    <th className="px-2 py-2 text-left font-semibold" style={{ color: 'var(--gpl-text2)' }}>Category</th>
                    <th className="px-2 py-2 text-left font-semibold" style={{ color: 'var(--gpl-text2)' }}>Description</th>
                    <th className="px-2 py-2 text-left font-semibold" style={{ color: 'var(--gpl-text2)' }}>BOQ Item</th>
                    <th className="px-2 py-2 text-center font-semibold" style={{ color: 'var(--gpl-text2)' }}>Admin %</th>
                    <th className="px-2 py-2 text-center font-semibold" style={{ color: 'var(--gpl-text2)' }}>Direct %</th>
                    <th className="px-2 py-2 text-center font-semibold" style={{ color: 'var(--gpl-text2)' }}>After Sale %</th>
                    <th className="px-2 py-2 text-center font-semibold" style={{ color: 'var(--gpl-text2)' }}>Contingency %</th>
                    <th className="px-2 py-2 text-left font-semibold" style={{ color: 'var(--gpl-text2)' }}>Remarks</th>
                    <th className="px-2 py-2 text-center" style={{ color: 'var(--gpl-text2)' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx} className="border-t" style={{ borderColor: 'rgba(30,48,80,.4)' }}>
                      <td className="px-2 py-2">
                        <input type="date" value={row.date} onChange={(e) => updateRow(idx, 'date', e.target.value)} className="w-full text-xs rounded border px-1 py-1" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }} />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="0.01" value={row.amount} onChange={(e) => updateRow(idx, 'amount', e.target.value)} className="w-full text-xs rounded border px-1 py-1 text-right" style={{ borderColor: row.amount && !row.category ? 'var(--gpl-border)' : row.category ? 'var(--gpl-border)' : 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }} required={row.category ? true : false} />
                      </td>
                      <td className="px-2 py-2">
                        <select value={row.category} onChange={(e) => updateRow(idx, 'category', e.target.value)} className="w-full text-xs rounded border px-1 py-1" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }} required>
                          <option value="">—</option>
                          {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input type="text" value={row.description} onChange={(e) => updateRow(idx, 'description', e.target.value)} className="w-full text-xs rounded border px-1 py-1" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }} required={row.category ? true : false} />
                      </td>
                      <td className="px-2 py-2">
                        <select value={row.boqItemId} onChange={(e) => updateRow(idx, 'boqItemId', e.target.value)} className="w-full text-xs rounded border px-1 py-1" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }}>
                          <option value="">—</option>
                          {items.map((i) => (
                            <option key={i.id} value={i.id}>{i.desc.slice(0, 15)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="0.1" value={row.adminPct} onChange={(e) => updateRow(idx, 'adminPct', e.target.value)} className="w-full text-xs rounded border px-1 py-1 text-center" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }} />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="0.1" value={row.directPct} onChange={(e) => updateRow(idx, 'directPct', e.target.value)} className="w-full text-xs rounded border px-1 py-1 text-center" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }} />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="0.1" value={row.afterSalePct} onChange={(e) => updateRow(idx, 'afterSalePct', e.target.value)} className="w-full text-xs rounded border px-1 py-1 text-center" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }} />
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="0.1" value={row.contingencyPct} onChange={(e) => updateRow(idx, 'contingencyPct', e.target.value)} className="w-full text-xs rounded border px-1 py-1 text-center" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }} />
                      </td>
                      <td className="px-2 py-2">
                        <input type="text" value={row.remarks} onChange={(e) => updateRow(idx, 'remarks', e.target.value)} className="w-full text-xs rounded border px-1 py-1" style={{ borderColor: 'var(--gpl-border)', background: 'var(--gpl-surface)', color: 'var(--gpl-text)' }} />
                      </td>
                      <td className="px-2 py-2 text-center">
                        {rows.length > 1 && (
                          <button type="button" onClick={() => removeRow(idx)} className="text-xs" style={{ color: 'var(--gpl-red)' }}>✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="px-5 py-4 border-t flex gap-2 justify-between" style={{ borderColor: 'var(--gpl-border)' }}>
            <div className="flex gap-2">
              <button type="button" onClick={addRow} className="px-3 py-2 text-xs rounded border" style={{ borderColor: 'var(--gpl-border)', color: 'var(--gpl-text)' }}>+ Add Row</button>
              <button type="button" onClick={() => fillSoftCostsDown('adminPct')} className="px-3 py-2 text-xs rounded border" style={{ borderColor: 'var(--gpl-border)', color: 'var(--gpl-text2)' }} title="Fill Admin % down">Fill Admin %</button>
              <button type="button" onClick={() => fillSoftCostsDown('directPct')} className="px-3 py-2 text-xs rounded border" style={{ borderColor: 'var(--gpl-border)', color: 'var(--gpl-text2)' }} title="Fill Direct % down">Fill Direct %</button>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-xs rounded border" style={{ borderColor: 'var(--gpl-border)', color: 'var(--gpl-text)' }}>
                Cancel
              </button>
              <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-xs rounded font-medium" style={{ background: 'var(--gpl-blue)', color: 'white', opacity: isSubmitting ? 0.6 : 1 }}>
                {isSubmitting ? 'Saving...' : `Submit (${rows.filter(r => r.category && r.description && r.amount).length} rows)`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
