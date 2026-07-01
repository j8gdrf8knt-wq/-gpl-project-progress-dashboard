'use client'
import { useState } from 'react'
import type { BOQItem } from '@/types'
import { fmtBDT } from '@/lib/formatters'
import EditBOQModal from './EditBOQModal'

interface Props {
  items: BOQItem[]
  projectId: string
  grandTotal: number
}

export default function BOQTable({ items, projectId, grandTotal }: Props) {
  const [editOpen, setEditOpen] = useState(false)

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: 'var(--gpl-card)', borderColor: 'var(--gpl-border)' }}
    >
      <div
        className="px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--gpl-border)', background: 'rgba(255,255,255,.015)' }}
      >
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gpl-text2)' }}>
          Bill of Quantities
        </span>
        <button
          onClick={() => setEditOpen(true)}
          className="text-xs px-3 py-1.5 rounded-lg border transition-opacity hover:opacity-80"
          style={{ borderColor: 'var(--gpl-blue)', color: 'var(--gpl-blue)' }}
        >
          ✏ Edit Data
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ minWidth: 700 }}>
          <thead>
            <tr style={{ background: 'rgba(11,22,40,.9)' }}>
              {['SL', 'Description', 'Qty', 'Unit', 'Unit Price', 'Total Price', 'Total Cost', 'Offer Price', 'Share %'].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-left font-bold uppercase tracking-wider border-b whitespace-nowrap"
                  style={{ color: 'var(--gpl-text2)', borderColor: 'var(--gpl-border)', fontSize: 9 }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-10" style={{ color: 'var(--gpl-text3)' }}>
                  No BOQ items — import Excel or click Edit Data
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const share = grandTotal > 0 ? (item.totalPrice / grandTotal) * 100 : 0
                return (
                  <tr
                    key={item.id}
                    className="border-b hover:bg-white/[.02] transition-colors"
                    style={{ borderColor: 'rgba(30,48,80,.4)', color: 'var(--gpl-text)' }}
                  >
                    <td className="px-3 py-2" style={{ color: 'var(--gpl-text2)' }}>{item.sl}</td>
                    <td className="px-3 py-2 font-medium max-w-[200px] truncate">{item.desc}</td>
                    <td className="px-3 py-2 text-right">{item.qty.toLocaleString()}</td>
                    <td className="px-3 py-2">{item.unit}</td>
                    <td className="px-3 py-2 text-right">৳{fmtBDT(item.unitPrice)}</td>
                    <td className="px-3 py-2 text-right font-medium" style={{ color: 'var(--gpl-blue)' }}>৳{fmtBDT(item.totalPrice)}</td>
                    <td className="px-3 py-2 text-right" style={{ color: 'var(--gpl-amber)' }}>৳{fmtBDT(item.totalCost)}</td>
                    <td className="px-3 py-2 text-right" style={{ color: 'var(--gpl-green)' }}>৳{fmtBDT(item.offerPrice)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--gpl-border)' }}>
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, share)}%`, background: 'var(--gpl-blue)' }} />
                        </div>
                        <span className="text-[9px] w-8 text-right" style={{ color: 'var(--gpl-text2)' }}>{share.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {editOpen && (
        <EditBOQModal items={items} projectId={projectId} onClose={() => setEditOpen(false)} />
      )}
    </div>
  )
}
