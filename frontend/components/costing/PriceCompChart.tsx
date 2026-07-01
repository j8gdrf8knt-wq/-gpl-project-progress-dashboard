'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { BOQItem } from '@/types'
import { fmtBDT } from '@/lib/formatters'

export default function PriceCompChart({ items }: { items: BOQItem[] }) {
  const data = [...items]
    .sort((a, b) => b.totalPrice - a.totalPrice)
    .slice(0, 8)
    .map((i) => ({
      name: i.desc.slice(0, 20),
      'Total Price': i.totalPrice,
      'Total Cost': i.totalCost,
      'Offer Price': i.offerPrice,
    }))

  if (data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--gpl-text3)' }}>No BOQ items</div>
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: 20, right: 20, top: 4, bottom: 60 }}>
        <XAxis dataKey="name" tick={{ fill: '#7e8da8', fontSize: 10 }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" interval={0} />
        <YAxis tick={{ fill: '#7e8da8', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `৳${fmtBDT(v)}`} />
        <Tooltip
          contentStyle={{ background: '#0f1e38', border: '1px solid #1e3050', borderRadius: 8, fontSize: 11 }}
          formatter={(v) => `৳${Number(v).toLocaleString()}`}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#7e8da8' }} />
        <Bar dataKey="Total Price" fill="#4f9cf9" radius={[4, 4, 0, 0]} maxBarSize={24} />
        <Bar dataKey="Total Cost" fill="#f5a623" radius={[4, 4, 0, 0]} maxBarSize={24} />
        <Bar dataKey="Offer Price" fill="#00d488" radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  )
}
