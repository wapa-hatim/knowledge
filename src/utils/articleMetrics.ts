export function parseViewCount(value: string) {
  const normalized = value.toLowerCase().replaceAll(',', '').trim()
  const count = Number.parseFloat(normalized)
  if (Number.isNaN(count)) return 0
  return normalized.endsWith('k') ? count * 1000 : count
}