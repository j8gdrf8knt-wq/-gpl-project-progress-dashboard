'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import type { Activity } from '@/types'
import { activityCompletionPct, badgeColor } from '@/lib/computations'

const COLOR_MAP = { green: '#00d488', amber: '#f5a623', red: '#ff4d6d' }

export default function ActivityBarChart({ activities }: { activities: Activity[] }) {
  const data = [...activities]
    .map((a) => ({ name: a.name.slice(0, 22), pct: parseFloat(activityCompletionPct(a).toFixed(1)) }))
    .sort((a, b) => b.pct - a.pct)

  if (data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--gpl-text3)' }}>No activities</div>
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
        <XAxis type="number" domain={[0, 100]} tick={{ fill: '#7e8da8', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
        <YAxis type="category" dataKey="name" tick={{ fill: '#7e8da8', fontSize: 11 }} width={110} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,.04)' }}
          contentStyle={{ background: '#0f1e38', border: '1px solid #1e3050', borderRadius: 8, fontSize: 12 }}
          formatter={(v) => [`${v}%`, 'Completion']}
        />
        <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={18}>
          {data.map((d, i) => (
            <Cell key={i} fill={COLOR_MAP[badgeColor(d.pct)]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
