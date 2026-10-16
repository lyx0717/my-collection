/** 逗号（中英文）、顿号分隔的标签文本 → 去重数组 */
export function parseTags(text: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of text.split(/[,，、]/)) {
    const tag = raw.trim().replace(/^#/, '')
    if (tag && !seen.has(tag)) {
      seen.add(tag)
      result.push(tag)
    }
  }
  return result
}

export function tagsToText(tags: string[]): string {
  return tags.join('，')
}
