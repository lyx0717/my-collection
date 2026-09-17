/** 把表单里逗号分隔的文本解析为去重后的标签数组 */
export function parseTags(text: string): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of text.split(/[,，、]/)) {
    const tag = raw.trim()
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
