'use client'
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import type { BOQItem } from '@/types'
import { fmtBDT } from '@/lib/formatters'

const COLORS = ['#4f9cf9','#2478e8','#00d488','#f5a623','#a78bfa','#7e8da8']

export default function CostDonut({ items, grandTotal }: { items: BOQItem[]; grandTotal: number }) {
  const sorted = [...items].sort((a, b) => b.totalPrice - a.totalPrice)
  const top5 = sorted.slice(0, 5)
  const rest = sorted.slice(5).reduce((s, i) => s + i.totalPrice, 0)

  const data = [
    ...top5.map((i) => ({ name: i.desc.slice(0, 20), value: i.totalPrice })),
    ...(rest > 0 ? [{ name: 'Others', value: rest }] : []),
  ]

  if (data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--gpl-text3)' }}>No data</div>
  }

  return (
    <PieChart width={260} height={220}>
      <Pie data={data} cx={130} cy={90} innerRadius={55} outerRadius={80} dataKey="value" strokeWidth={0}>
        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
      </Pie>
      <Tooltip
        contentStyle={{ background: '#0f1e38', border: '1px solid #1e3050', borderRadius: 8, fontSize: 11 }}
        formatter={(v) => { const n = Number(v); return [`৳${fmtBDT(n)} (${grandTotal > 0 ? ((n / grandTotal) * 100).toFixed(1) : 0}%)`, '']; }}
      />
      <Legend wrapperStyle={{ fontSize: 10, color: '#7e8da8' }} />
    </PieChart>
  )
}
