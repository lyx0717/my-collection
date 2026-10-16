import { useCallback, useEffect, useState } from 'react'

export function useBatchSelection(visibleIds: string[]) {
  const [batchMode, setBatchMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(allVisibleSelected ? new Set() : new Set(visibleIds))
  }, [allVisibleSelected, visibleIds])

  const exitBatch = useCallback(() => {
    setBatchMode(false)
    setSelectedIds(new Set())
  }, [])

  const enterBatch = useCallback(() => {
    setBatchMode(true)
    setSelectedIds(new Set())
  }, [])

  // 筛选变化后剔除不可见选中项
  useEffect(() => {
    if (!batchMode) return
    const visibleSet = new Set(visibleIds)
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => visibleSet.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [batchMode, visibleIds])

  return {
    batchMode,
    selectedIds,
    selectedCount: selectedIds.size,
    allVisibleSelected,
    toggleSelect,
    toggleSelectAll,
    enterBatch,
    exitBatch,
  }
}
