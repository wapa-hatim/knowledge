export function downloadCsv(filename: string, headers: string[], rows: unknown[][]) {
  const escapeCell = (value: unknown) => {
    let text = String(value ?? '')
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
    return `"${text.replaceAll('"', '""')}"`
  }
  const contents = [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${contents}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${filename}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}