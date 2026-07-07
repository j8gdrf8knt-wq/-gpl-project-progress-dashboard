'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { parsePastedData, mapColumnsToFields } from '@/lib/parsePastedData'
import type { ExpenseEntry } from '@/types'

interface Props {
  projectId: string
  onSuccess?: () => void
}

const EXPENSE_FIELDS = [
  'date', 'amount', 'category', 'description', 'remarks', 'boqItemId',
  'adminCost', 'directCost', 'afterSale', 'contingency'
]

export default function BulkExpensesPaster({ projectId, onSuccess }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [pastedText, setPastedText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [columnMapping, setColumnMapping] = useState<Record<number, string>>({})

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 text-xs font-semibold rounded-lg border"
        style={{
          background: 'var(--gpl-blue)',
          color: 'white',
          borderColor: 'var(--gpl-blue)',
        }}
      >
        📋 Paste Multiple
      </button>
    )
  }

  const parsed = pastedText ? parsePastedData(pastedText) : { headers: [], rows: [] }

  const handlePaste = async () => {
    if (parsed.rows.length === 0) return

    setIsLoading(true)
    try {
      const expenses = parsed.rows
        .filter(row => row.values.some(v => v.length > 0))
        .map((row, idx) => {
          const exp: any = {
            date: row.values[columnMapping[0] !== undefined ? Number(columnMapping[0]) : 0] || new Date().toISOString().slice(0, 10),
            amount: Number(row.values[Number(Object.keys(columnMapping).find(k => columnMapping[Number(k)] === 'amount'))] || 0),
            category: row.values[Number(Object.keys(columnMapping).find(k => columnMapping[Number(k)] === 'category'))] || 'General',
            description: row.values[Number(Object.keys(columnMapping).find(k => columnMapping[Number(k)] === 'description'))] || '',
          }

          // Optional fields
          Object.entries(columnMapping).forEach(([colIdx, field]) => {
            const value = row.values[Number(colIdx)]
            if (value && !['date', 'amount', 'category', 'description'].includes(field)) {
              exp[field] = isNaN(Number(value)) ? value : Number(value)
            }
          })

          return exp
        })

      const res = await fetch(`/api/projects/${projectId}/expenses/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenses }),
      })

      const data = await res.json()
      setResult(data)

      if (data.created > 0) {
        setTimeout(() => {
          setIsOpen(false)
          setPastedText('')
          onSuccess?.()
          router.refresh()
        }, 1500)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={() => !isLoading && setIsOpen(false)}
    >
      <div
        className="bg-[var(--gpl-card)] rounded-2xl border max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
        style={{ borderColor: 'var(--gpl-border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="px-6 py-4 border-b font-semibold flex justify-between items-center"
          style={{ borderColor: 'var(--gpl-border)', color: 'var(--gpl-text)' }}
        >
          <span>📋 Paste Multiple Expenses</span>
          <button onClick={() => setIsOpen(false)} className="text-xl">✕</button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {/* Instructions */}
          <div className="text-xs p-3 rounded-lg" style={{ background: 'rgba(255,255,255,.05)', color: 'var(--gpl-text2)' }}>
            Paste tab-separated or comma-separated data. Include a header row with columns like: Date, Amount, Category, Description
          </div>

          {/* Textarea */}
          <textarea
            value={pastedText}
            onChange={e => setPastedText(e.target.value)}
            placeholder="Paste data here...&#10;Date     Amount     Category     Description&#10;2025-01-15     5000     Labour     Excavation"
            className="w-full h-32 p-3 rounded-lg font-mono text-sm border"
            style={{
              background: 'var(--gpl-surface)',
              borderColor: 'var(--gpl-border)',
              color: 'var(--gpl-text)',
            }}
          />

          {/* Column Mapper */}
          {parsed.headers.length > 0 && (
            <div className="border rounded-lg p-4" style={{ borderColor: 'var(--gpl-border)' }}>
              <div className="text-xs font-semibold mb-3" style={{ color: 'var(--gpl-text2)' }}>Column Mapping</div>
              <div className="grid grid-cols-2 gap-3">
                {parsed.headers.map((header, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="text-xs flex-1" style={{ color: 'var(--gpl-text2)' }}>{header}</div>
                    <select
                      value={columnMapping[idx] || ''}
                      onChange={e => setColumnMapping({ ...columnMapping, [idx]: e.target.value })}
                      className="text-xs px-2 py-1 rounded border"
                      style={{
                        background: 'var(--gpl-surface)',
                        borderColor: 'var(--gpl-border)',
                        color: 'var(--gpl-text)',
                      }}
                    >
                      <option value="">Skip</option>
                      {EXPENSE_FIELDS.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {parsed.rows.length > 0 && (
            <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--gpl-border)' }}>
              <div className="text-xs font-semibold p-3 border-b" style={{ color: 'var(--gpl-text2)', borderColor: 'var(--gpl-border)' }}>
                Preview ({parsed.rows.length} rows)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,.05)' }}>
                      {['Date', 'Amount', 'Category', 'Description'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--gpl-text2)' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--gpl-border)' }}>
                        <td className="px-3 py-2">{row.values[0]}</td>
                        <td className="px-3 py-2">{row.values[1]}</td>
                        <td className="px-3 py-2">{row.values[2]}</td>
                        <td className="px-3 py-2">{row.values[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{
                background: result.created > 0 ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
                color: result.created > 0 ? 'var(--gpl-green)' : 'var(--gpl-red)',
              }}
            >
              ✓ Created {result.created} expense{result.created !== 1 ? 's' : ''}
              {result.errors?.length > 0 && ` | ${result.errors.length} error${result.errors.length !== 1 ? 's' : ''}`}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 rounded-lg border text-sm font-semibold"
              style={{
                background: 'var(--gpl-surface)',
                borderColor: 'var(--gpl-border)',
                color: 'var(--gpl-text)',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handlePaste}
              disabled={parsed.rows.length === 0 || isLoading}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
              style={{
                background: 'var(--gpl-blue)',
              }}
            >
              {isLoading ? 'Importing...' : `Import ${parsed.rows.length} entries`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
