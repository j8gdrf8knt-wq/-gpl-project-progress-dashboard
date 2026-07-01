import { NextRequest, NextResponse } from 'next/server'
import { read, utils } from 'xlsx'

interface DetectionResult {
  type: 'expenses' | 'activities' | 'mixed' | 'unknown'
  sheets: string[]
  selectedSheet: string
  headers: string[]
  mapping: Record<string, number>
  preview: unknown[][]
  confidence: number
}

const EXPENSE_ALIASES: Record<string, string[]> = {
  date: ['date', 'date entry', 'entry date', 'exp date'],
  amount: ['amount', 'cost', 'expense', 'total', 'price'],
  category: ['category', 'type', 'category type', 'expense type'],
  description: ['description', 'item', 'desc', 'details'],
  boqItem: ['boq item', 'boq', 'item name', 'boq id'],
  remarks: ['remarks', 'notes', 'comments', 'note'],
  adminPct: ['admin %', 'admin pct', 'admin percentage'],
  directPct: ['direct %', 'direct pct', 'direct percentage'],
  afterSalePct: ['after sale %', 'after sale pct', 'after sale percentage'],
  contingencyPct: ['contingency %', 'contingency pct', 'contingency percentage'],
}

const ACTIVITY_ALIASES: Record<string, string[]> = {
  name: ['activity', 'name', 'activity name', 'task'],
  qty: ['qty', 'quantity', 'total qty', 'target qty'],
  unit: ['unit', 'uom', 'unit of measure'],
  todayAchiev: ['today achievement', 'today', "today's achievement"],
  totalPresent: ['total present', 'total', 'total achievement', 'cumulative'],
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().trim()
}

function scoreColumns(headers: string[], aliases: Record<string, string[]>): Record<string, number> {
  const normalized = headers.map(normalizeHeader)
  const scores: Record<string, number> = {}

  for (const [key, aliasList] of Object.entries(aliases)) {
    let bestScore = 0
    for (let i = 0; i < normalized.length; i++) {
      const header = normalized[i]
      for (const alias of aliasList) {
        const aliasNorm = normalizeHeader(alias)
        if (header === aliasNorm) {
          bestScore = 1.0
          break
        } else if (header.includes(aliasNorm) || aliasNorm.includes(header)) {
          bestScore = Math.max(bestScore, 0.7)
        }
      }
      if (bestScore === 1.0) break
    }
    scores[key] = bestScore
  }

  return scores
}

function detectType(headers: string[]): { type: 'expenses' | 'activities' | 'unknown', confidence: number } {
  const expenseScores = scoreColumns(headers, EXPENSE_ALIASES)
  const activityScores = scoreColumns(headers, ACTIVITY_ALIASES)

  const expenseConfidence = Object.values(expenseScores).filter(s => s > 0).length / Object.keys(EXPENSE_ALIASES).length
  const activityConfidence = Object.values(activityScores).filter(s => s > 0).length / Object.keys(ACTIVITY_ALIASES).length

  if (expenseConfidence > activityConfidence) {
    return { type: 'expenses', confidence: expenseConfidence }
  } else if (activityConfidence > expenseConfidence) {
    return { type: 'activities', confidence: activityConfidence }
  }

  return { type: 'unknown', confidence: 0 }
}

function createMapping(headers: string[], aliases: Record<string, string[]>): Record<string, number> {
  const mapping: Record<string, number> = {}
  const normalized = headers.map(normalizeHeader)

  for (const [key, aliasList] of Object.entries(aliases)) {
    for (let i = 0; i < normalized.length; i++) {
      const header = normalized[i]
      for (const alias of aliasList) {
        const aliasNorm = normalizeHeader(alias)
        if (header === aliasNorm || header.includes(aliasNorm)) {
          mapping[key] = i
          break
        }
      }
      if (mapping[key] !== undefined) break
    }
  }

  return mapping
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = read(buffer)

    const sheetNames = workbook.SheetNames
    const selectedSheet = sheetNames[0]
    const sheet = workbook.Sheets[selectedSheet]

    const headers = utils.sheet_to_json(sheet, { header: 1 })[0] as string[]
    const preview = utils.sheet_to_json(sheet, { header: 1 }).slice(1, 6) as unknown[][]

    const { type, confidence } = detectType(headers)

    const aliases = type === 'expenses' ? EXPENSE_ALIASES : ACTIVITY_ALIASES
    const mapping = createMapping(headers, aliases)

    const result: DetectionResult = {
      type: confidence < 0.3 ? 'unknown' : type,
      sheets: sheetNames,
      selectedSheet,
      headers,
      mapping,
      preview,
      confidence: Math.min(confidence, 1),
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Detection error:', error)
    return NextResponse.json({ error: 'Failed to detect file type' }, { status: 500 })
  }
}
