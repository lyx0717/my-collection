/** 列表里的紧凑日期：今年 MM-DD，往年 YYYY-MM-DD */
export function shortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  if (d.getFullYear() === now.getFullYear()) return `${mm}-${dd}`
  return `${d.getFullYear()}-${mm}-${dd}`
}
