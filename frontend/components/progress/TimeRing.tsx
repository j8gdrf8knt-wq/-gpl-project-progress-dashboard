'use client'
import { PieChart, Pie, Cell } from 'recharts'

export default function TimeRing({ pct }: { pct: number }) {
  const data = [{ value: pct }, { value: Math.max(0, 100 - pct) }]
  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      <PieChart width={180} height={180}>
        <Pie
          data={data}
          cx={90}
          cy={90}
          innerRadius={62}
          outerRadius={82}
          startAngle={90}
          endAngle={-270}
          dataKey="value"
          strokeWidth={0}
        >
          <Cell fill="#f5a623" />
          <Cell fill="#1e3050" />
        </Pie>
      </PieChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color: '#f5a623' }}>{pct}%</span>
        <span className="text-[10px] mt-0.5" style={{ color: '#7e8da8' }}>Time Used</span>
      </div>
    </div>
  )
}
