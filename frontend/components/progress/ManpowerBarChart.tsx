'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { Activity } from '@/types'

export default function ManpowerBarChart({ activities }: { activities: Activity[] }) {
  const data = activities.map((a) => ({
    name: a.name.slice(0, 22),
    Required: a.reqManpower,
    Deployed: a.personsDay,
  }))

  if (data.length === 0) {
    return <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--gpl-text3)' }}>No activities</div>
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
        <XAxis type="number" tick={{ fill: '#7e8da8', fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fill: '#7e8da8', fontSize: 11 }} width={110} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,.04)' }}
          contentStyle={{ background: '#0f1e38', border: '1px solid #1e3050', borderRadius: 8, fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#7e8da8' }} />
        <Bar dataKey="Required" fill="#a78bfa" radius={[0, 4, 4, 0]} maxBarSize={14} />
        <Bar dataKey="Deployed" fill="#4f9cf9" radius={[0, 4, 4, 0]} maxBarSize={14} />
      </BarChart>
    </ResponsiveContainer>
  )
}
