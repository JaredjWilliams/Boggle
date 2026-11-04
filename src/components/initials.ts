export function playerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '•'
  const first = parts[0]?.[0] ?? ''
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : (parts[0]?.[1] ?? '')
  return `${first}${second}`.toUpperCase()
}
