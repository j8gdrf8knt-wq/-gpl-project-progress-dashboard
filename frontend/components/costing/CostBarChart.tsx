'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import type { BOQItem } from '@/types'
import { fmtBDT } from '@/lib/formatters'

const COLORS = ['#4f9cf9','#2478e8','#00d488','#f5a623','#a78bfa','#ff4d6d','#7e8da8','#3e5070']

export default function CostBarChart({ items }: { items: BOQItem[] }) {
  const data = [...items]
    .sort((a, b) => b.totalPrice - a.totalPrice)
    .slice(0, 8)
    .map((i, idx) => ({ name: i.desc.slice(0, 28), value: i.totalPrice, color: COLORS[idx] }))

  if (data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--gpl-text3)' }}>No BOQ items</div>
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 60, top: 4, bottom: 4 }}>
        <XAxis type="number" tick={{ fill: '#7e8da8', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `৳${fmtBDT(v)}`} />
        <YAxis type="category" dataKey="name" tick={{ fill: '#7e8da8', fontSize: 11 }} width={160} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,.04)' }}
          contentStyle={{ background: '#0f1e38', border: '1px solid #1e3050', borderRadius: 8, fontSize: 12 }}
          formatter={(v) => [`৳${Number(v).toLocaleString()}`, 'Total Price']}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20} label={{ position: 'right', formatter: (v: unknown) => `৳${fmtBDT(Number(v))}`, fill: '#7e8da8', fontSize: 10 }}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
