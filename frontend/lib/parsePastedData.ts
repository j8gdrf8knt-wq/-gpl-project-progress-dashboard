export interface ParsedRow {
  values: string[]
  errors?: string[]
}

export interface ParseResult {
  headers: string[]
  rows: ParsedRow[]
}

export function parsePastedData(text: string): ParseResult {
  const lines = text.trim().split('\n')
  if (lines.length === 0) return { headers: [], rows: [] }

  const firstLine = lines[0]
  const delimiter = detectDelimiter(firstLine)

  const headers = parseLine(firstLine, delimiter)
  const rows = lines.slice(1).map(line => ({
    values: parseLine(line, delimiter),
  }))

  return { headers, rows }
}

function detectDelimiter(line: string): string {
  const tabCount = (line.match(/\t/g) || []).length
  const commaCount = (line.match(/,/g) || []).length
  const pipeCount = (line.match(/\|/g) || []).length

  if (tabCount > commaCount && tabCount > pipeCount) return '\t'
  if (pipeCount > commaCount) return '|'
  return ','
}

function parseLine(line: string, delimiter: string): string[] {
  if (delimiter === '\t') {
    return line.split('\t').map(s => s.trim())
  }

  // Handle CSV with quoted values
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

export function mapColumnsToFields<T extends Record<string, any>>(
  rows: ParsedRow[],
  columnMapping: Record<number, keyof T>,
  defaults: Partial<T> = {}
): T[] {
  return rows
    .filter(row => row.values.some(v => v.length > 0))
    .map(row => {
      const obj: any = { ...defaults }
      Object.entries(columnMapping).forEach(([colIdx, fieldName]) => {
        const value = row.values[Number(colIdx)]
        if (value) obj[fieldName] = value
      })
      return obj as T
    })
}
