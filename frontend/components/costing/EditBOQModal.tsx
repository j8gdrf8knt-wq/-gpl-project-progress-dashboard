'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BOQItem } from '@/types'

type Row = Pick<BOQItem, 'sl' | 'desc' | 'qty' | 'unit' | 'unitPrice' | 'totalPrice' | 'totalCost' | 'offerPrice'>

const FIELDS: { key: keyof Row; label: string; type?: string }[] = [
  { key: 'sl', label: 'SL', type: 'number' },
  { key: 'desc', label: 'Description' },
  { key: 'qty', label: 'Qty', type: 'number' },
  { key: 'unit', label: 'Unit' },
  { key: 'unitPrice', label: 'Unit Price', type: 'number' },
  { key: 'totalPrice', label: 'Total Price', type: 'number' },
  { key: 'totalCost', label: 'Total Cost', type: 'number' },
  { key: 'offerPrice', label: 'Offer Price', type: 'number' },
]

export default function EditBOQModal({
  items,
  projectId,
  onClose,
}: {
  items: BOQItem[]
  projectId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>(
    items.map((i) => ({ sl: i.sl, desc: i.desc, qty: i.qty, unit: i.unit, unitPrice: i.unitPrice, totalPrice: i.totalPrice, totalCost: i.totalCost, offerPrice: i.offerPrice }))
  )
  const [saving, setSaving] = useState(false)

  function updateCell(rowIdx: number, key: keyof Row, value: string) {
    setRows((prev) => {
      const next = [...prev]
      const row = { ...next[rowIdx] }
      if (key === 'desc' || key === 'unit') {
        ;(row as Record<string, unknown>)[key] = value
      } else {
        ;(row as Record<string, unknown>)[key] = parseFloat(value) || 0
      }
      next[rowIdx] = row
      return next
    })
  }

  function addRow() {
    setRows((prev) => [...prev, { sl: prev.length + 1, desc: '', qty: 0, unit: '', unitPrice: 0, totalPrice: 0, totalCost: 0, offerPrice: 0 }])
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/projects/${projectId}/items`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows.filter((r) => r.desc.trim() !== '')),
    })
    setSaving(false)
    onClose()
    router.refresh()
  }

  const inputCls = 'w-full bg-transparent border rounded px-2 py-1 text-xs outline-none focus:border-[var(--gpl-blue)]'
  const inputStyle = { borderColor: 'var(--gpl-border)', color: 'var(--gpl-text)' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-[900px] rounded-2xl border flex flex-col"
        style={{ background: 'var(--gpl-card)', borderColor: 'var(--gpl-border)', maxHeight: '85vh' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--gpl-border)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--gpl-text)' }}>Edit BOQ Data</h2>
          <button onClick={onClose} style={{ color: 'var(--gpl-text2)' }}>✕</button>
        </div>
        <div className="overflow-auto flex-1 p-4">
          <table className="w-full text-xs" style={{ minWidth: 800 }}>
            <thead>
              <tr>
                {FIELDS.map((f) => (
                  <th key={f.key} className="px-2 py-2 text-left font-semibold uppercase tracking-wide" style={{ color: 'var(--gpl-text2)', fontSize: 9 }}>{f.label}</th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t" style={{ borderColor: 'rgba(30,48,80,.4)' }}>
                  {FIELDS.map((f) => (
                    <td key={f.key} className="px-1 py-1">
                      <input type={f.type ?? 'text'} className={inputCls} style={inputStyle} value={String(row[f.key] ?? '')} onChange={(e) => updateCell(i, f.key, e.target.value)} />
                    </td>
                  ))}
                  <td className="px-1 py-1">
                    <button onClick={() => removeRow(i)} className="text-[var(--gpl-red)] hover:opacity-70 text-xs px-1">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={addRow} className="mt-3 text-xs px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--gpl-border)', color: 'var(--gpl-text2)' }}>
            + Add Row
          </button>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t" style={{ borderColor: 'var(--gpl-border)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: 'var(--gpl-border)', color: 'var(--gpl-text2)' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'var(--gpl-blue2)' }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
