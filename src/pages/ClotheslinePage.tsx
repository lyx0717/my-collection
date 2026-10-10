import { useState, useCallback } from 'react'
import { ClotheslineStage, GROUPS, type GroupDef } from '../components/clothesline/ClotheslineStage'

/**
 * 阶段 1 的原型外壳：只有分组导航、风量滑杆、性能读数。
 *
 * 刻意不加任何装饰性 UI —— 这一阶段要验的是摆动观感，
 * 界面元素越少，视线越不会被带走。
 */
export function ClotheslinePage() {
  const [group, setGroup] = useState<GroupDef>(GROUPS[0])
  const [wind, setWind] = useState(0.25)
  const [metrics, setMetrics] = useState({ fps: 0, nodes: 0, cards: 0, constraintMs: 0, maxError: 0 })

  const onMetrics = useCallback(
    (m: { fps: number; nodes: number; cards: number; constraintMs: number; maxError: number }) => {
      setMetrics(m)
    },
    [],
  )

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        gridTemplateRows: '1fr auto',
        font:
          '13px/1.6 system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
        color: '#4A3A22',
      }}
    >
      {/* 场景占满整个视口，UI 全部浮在上面 */}
      <div style={{ position: 'relative', gridRow: '1 / -1' }}>
        <ClotheslineStage group={group} windStrength={wind} onMetrics={onMetrics} />

        {/* 顶部分组导航 */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 18,
            zIndex: 10,
            display: 'flex',
            gap: 6,
            alignItems: 'center',
          }}
        >
          {GROUPS.map((g) => {
            const active = g.id === group.id
            return (
              <button
                key={g.id}
                onClick={() => setGroup(g)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  borderRadius: 999,
                  border: '0.5px solid rgba(0,0,0,0.12)',
                  background: active ? g.color : 'rgba(255,255,255,0.86)',
                  color: active ? '#fff' : '#5F4A2C',
                  font: '500 12px/1.4 inherit',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(90,70,45,0.14)',
                }}
              >
                {!active && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: g.color,
                      display: 'inline-block',
                    }}
                  />
                )}
                {g.name} {g.count}
              </button>
            )
          })}
        </div>

        {/* 左下：风量 */}
        <div
          style={{
            position: 'absolute',
            left: 18,
            bottom: 18,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 14px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.9)',
            border: '0.5px solid rgba(0,0,0,0.1)',
            boxShadow: '0 1px 4px rgba(90,70,45,0.14)',
          }}
        >
          <span style={{ color: '#6B5738' }}>风量</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(wind * 100)}
            onChange={(e) => setWind(Number(e.target.value) / 100)}
            style={{ width: 130 }}
          />
          <span style={{ color: '#8A7355', minWidth: 56 }}>
            {wind === 0 ? '静谧' : wind < 0.15 ? '微风' : wind < 0.5 ? '和风' : wind < 0.8 ? '强风' : '大风'}
          </span>
        </div>

        {/* 右下：性能读数 */}
        <div
          style={{
            position: 'absolute',
            right: 18,
            bottom: 18,
            zIndex: 10,
            padding: '8px 14px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.9)',
            border: '0.5px solid rgba(0,0,0,0.1)',
            font: '12px/1.7 ui-monospace, SFMono-Regular, Menlo, monospace',
            color: '#5F4A2C',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <div>
            fps <b style={{ fontWeight: 500 }}>{metrics.fps}</b>
            <span style={{ opacity: 0.5, marginLeft: 10 }}>物理 {metrics.constraintMs}ms</span>
          </div>
          <div>
            节点 <b style={{ fontWeight: 500 }}>{metrics.nodes}</b>
            <span style={{ opacity: 0.5, marginLeft: 10 }}>卡片 {metrics.cards}</span>
            <span style={{ opacity: 0.5, marginLeft: 10 }}>绳长 {group.ropeSpan}</span>
          </div>
          <div style={{ opacity: 0.6 }}>约束残差 {metrics.maxError}</div>
        </div>

        {/* 操作提示 */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 22,
            transform: 'translateX(-50%)',
            zIndex: 10,
            fontSize: 12,
            color: '#6B5738',
            opacity: 0.72,
            whiteSpace: 'nowrap',
          }}
        >
          拖动卡片可甩动绳索 · 空白处拖动或滚轮可横向平移
        </div>
      </div>
    </div>
  )
}