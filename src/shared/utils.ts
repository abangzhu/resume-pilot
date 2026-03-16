export function generateId(): string {
  return crypto.randomUUID()
}

export function now(): number {
  return Date.now()
}

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes > 0) {
    return `${minutes}分${remainingSeconds}秒`
  }
  return `${remainingSeconds}秒`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function getRecommendationLabel(rec: 'pass' | 'hold' | 'reject'): string {
  const labels: Record<string, string> = {
    pass: '推荐',
    hold: '待定',
    reject: '不推荐',
  }
  return labels[rec] ?? rec
}

export function getRecommendationColor(rec: 'pass' | 'hold' | 'reject'): string {
  const colors: Record<string, string> = {
    pass: '#22c55e',
    hold: '#f59e0b',
    reject: '#ef4444',
  }
  return colors[rec] ?? '#6b7280'
}

export function getScoreColor(score: number): string {
  if (score >= 90) return '#22c55e'
  if (score >= 80) return '#3b82f6'
  if (score >= 70) return '#f59e0b'
  if (score >= 60) return '#f97316'
  return '#ef4444'
}
