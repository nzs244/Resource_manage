/** Minimal CSV builder for quick exports (open in Excel, edit, re-import). */

function csvCell(v: string): string {
  const s = String(v ?? '')
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function rowsToCsv(headers: string[], rows: string[][]): string {
  const lines = [
    headers.map(csvCell).join(','),
    ...rows.map((r) => r.map((c) => csvCell(c)).join(',')),
  ]
  return lines.join('\n')
}

export function downloadCsvText(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
