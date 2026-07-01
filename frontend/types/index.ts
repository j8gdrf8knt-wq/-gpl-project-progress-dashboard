export interface Activity {
  id: string
  projectId: string
  name: string
  qty: number
  unit: string
  todayAchiev: number
  pctToday: number
  totalPresent: number
  pctTotal: number
  pctProject: number
  targetDate: string | null
  availDays: number
  reqRate: number
  reqManpower: number
  personsDay: number
  highlighted: boolean
  order: number
}

export interface BOQItem {
  id: string
  projectId: string
  sl: number
  desc: string
  qty: number
  unit: string
  unitPrice: number
  totalPrice: number
  totalCost: number
  offerPrice: number
}

export interface ExpenseEntry {
  id: string
  projectId: string
  date: string
  category: string
  description: string
  amount: number
  boqItemId: string | null
  adminCost: number | null
  directCost: number | null
  afterSale: number | null
  contingency: number | null
  remarks: string | null
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  name: string
  client: string | null
  subtitle: string | null
  startDate: string
  targetDate: string
  reportDate: string | null
  createdAt: string
  updatedAt: string
  activities: Activity[]
  items: BOQItem[]
  expenses?: ExpenseEntry[]
}

export interface ProjectSummary {
  id: string
  name: string
  client: string | null
  startDate: string
  targetDate: string
  createdAt: string
  _count: { activities: number; items: number }
}

export interface ProgressMetrics {
  totalPct: number
  todayRatePct: number
  manpowerDeployed: number
  manpowerRequired: number
  daysLeft: number
  daysElapsed: number
  totalDays: number
  timePct: number
  daysWorked: number
  reportDate: string
}

export interface CostMetrics {
  grandTotal: number
  grandCost: number
  grandOffer: number
  topItem: BOQItem | null
}

export interface ColMapField {
  key: keyof Activity
  label: string
  aliases: string[]
}
