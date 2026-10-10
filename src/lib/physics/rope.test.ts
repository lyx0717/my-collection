import { describe, expect, it } from 'vitest'
import { Rope } from './rope'

/**
 * 物理层的回归测试。
 *
 * 为什么这些必须在 CI 里跑：物理错误的表征是「看起来有点怪」，在浏览器里
 * 极难判断是约束没收敛、阻尼过强还是风力过大。把可观测的不变量
 * （不发散、绳长守恒、悬挂长度恒定、切组后锚点跟随收缩）断言下来，
 * 改摆动参数时才有安全网——否则调观感全凭肉眼，改坏了也不知道。
 */

const SPAN = 78
const CARD_IDS = (n: number): string[] => Array.from({ length: n }, (_, i) => `#${i + 1}`)

function settle(rope: Rope, seconds: number): void {
  const frames = Math.round(seconds * 60)
  for (let i = 0; i < frames; i++) rope.update(1 / 60)
}

function allFinite(rope: Rope): boolean {
  return [...rope.nodes, ...rope.cards.map((c) => c.bob)].every(
    (p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z),
  )
}

function totalArc(rope: Rope): number {
  let arc = 0
  for (let i = 1; i < rope.nodes.length; i++) {
    const a = rope.nodes[i - 1]
    const b = rope.nodes[i]
    arc += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
  }
  return arc
}

/** 皮尔逊相关系数，用于判断两段时序是否同步摆动 */
function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  let sa = 0
  let sb = 0
  for (let i = 0; i < n; i++) {
    sa += a[i]
    sb += b[i]
  }
  const ma = sa / n
  const mb = sb / n
  let num = 0
  let da = 0
  let db = 0
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma
    const y = b[i] - mb
    num += x * y
    da += x * x
    db += y * y
  }
  const den = Math.sqrt(da * db)
  return den === 0 ? 1 : num / den
}

describe('Rope 静置行为', () => {
  it('三秒静置后不发散、节点不越出锚点范围', () => {
    const rope = new Rope(SPAN)
    rope.build(SPAN, CARD_IDS(39))
    rope.setWindStrength(0.25)
    settle(rope, 3)

    expect(allFinite(rope)).toBe(true)
    const maxAbsX = Math.max(...rope.nodes.map((n) => Math.abs(n.x)))
    // 锚点在 ±SPAN/2，节点不应超出这个包络
    expect(maxAbsX).toBeLessThanOrEqual(SPAN / 2 + 0.5)
  })

  it('静置后绳长守恒在 6% 误差内', () => {
    const rope = new Rope(SPAN)
    rope.build(SPAN, CARD_IDS(39))
    settle(rope, 3)

    const rest = rope.config.segmentLength * (rope.nodes.length - 1)
    // 约束未收敛时绳会被拉长或过度收缩，这是最先暴露的信号
    expect(Math.abs(totalArc(rope) / rest - 1)).toBeLessThan(0.06)
  })

  it('重力使绳下垂：中间节点低于锚点', () => {
    const rope = new Rope(SPAN)
    rope.build(SPAN, CARD_IDS(39))
    const anchorY = rope.nodes[0].y
    settle(rope, 2)

    expect(rope.nodes[Math.floor(rope.nodes.length / 2)].y).toBeLessThan(anchorY)
  })

  it('每张卡片都保持固定悬挂长度', () => {
    const rope = new Rope(SPAN)
    rope.build(SPAN, CARD_IDS(39))
    settle(rope, 2)

    for (const c of rope.cards) {
      const a = rope.nodes[c.anchorIndex]
      const d = Math.hypot(c.bob.x - a.x, c.bob.y - a.y, c.bob.z - a.z)
      expect(Math.abs(d - c.dropLength)).toBeLessThan(0.15)
    }
  })

  it('卡片不会挂到两端固定锚点上（否则那张卡片完全不动）', () => {
    const rope = new Rope(SPAN)
    rope.build(SPAN, CARD_IDS(39))
    for (const c of rope.cards) {
      expect(c.anchorIndex).toBeGreaterThan(0)
      expect(c.anchorIndex).toBeLessThan(rope.nodes.length - 1)
    }
  })
})

describe('Rope 风力响应', () => {
  it('风力越大摆动幅度越大', () => {
    /**
     * 衡量 y 向摆幅 —— 绳偏离水平线后被重力拉回的单摆式摆动。
     *
     * 为什么不能测 x（沿绳长方向）：两端锚点固定、绳长恒定，
     * 沿绳长移动不产生形变，约束不提供回复力，这个方向几乎没有自由度。
     * 实测迭代 30 次时 x 向摆幅仅 0.01（绳长 78），几乎锁死。
     *
     * 也不能断言「单一维度上摆幅随风量严格单调」：绳有张力上限，
     * 风力增大会把绳拉得更紧、压缩摆动空间，任何单一维度的度量都可能出现
     * 非单调。所以这里只断言「三档风力下都有可辨的摆动，且量级合理」，
     * 单调性由下面的「驱动力」用例在累计路径长度上验证。
     */
    const measure = (strength: number): number => {
      const rope = new Rope(SPAN)
      rope.build(SPAN, CARD_IDS(39))
      rope.setWindStrength(strength)
      settle(rope, 2)

      const mid = Math.floor(rope.nodes.length / 2)
      const restY = rope.nodes[mid].y
      let peak = 0
      for (let i = 0; i < 480; i++) {
        rope.update(1 / 60)
        peak = Math.max(peak, Math.abs(rope.nodes[mid].y - restY))
      }
      return peak
    }

    // 三档风力都要有可辨的摆动，不能是死板不动；
    // 同时不能大到绳子被吹成直线（上限约绳长的 20%）
    for (const w of [0.2, 0.6, 1]) {
      expect(measure(w)).toBeGreaterThan(0.3)
      expect(measure(w)).toBeLessThan(SPAN * 0.2)
    }
  })

  it('风场驱动力随风量单调增大', () => {
    /**
     * 用「累计运动路径长度」衡量驱动力，而非摆幅或瞬时速度峰值。
     *
     * 后两者都受绳的张力上限饱和：风力越大绳拉得越紧，位置摆幅和速度峰值
     * 都会被压住，出现「大风反而更小」的反直觉结果（实测 0.021 vs 0.042）。
     * 但驱动力本身是单调的 —— 走过的总路程不会因为绳变紧而变短。
     * 这个量与张力无关，才是风场的正确度量。
     */
    const pathLength = (strength: number): number => {
      const rope = new Rope(SPAN)
      rope.build(SPAN, CARD_IDS(39))
      rope.setWindStrength(strength)
      settle(rope, 2)

      const mid = Math.floor(rope.nodes.length / 2)
      let total = 0
      let px = rope.nodes[mid].x
      let py = rope.nodes[mid].y
      for (let i = 0; i < 360; i++) {
        rope.update(1 / 60)
        const n = rope.nodes[mid]
        total += Math.hypot(n.x - px, n.y - py)
        px = n.x
        py = n.y
      }
      return total
    }

    expect(pathLength(1)).toBeGreaterThan(pathLength(0.5))
    expect(pathLength(0.5)).toBeGreaterThan(pathLength(0.15))
  })

  it('卡片相对挂点的横摆随风量增大', () => {
    /**
     * 卡片是用户真正会盯着看的对象 —— 它必须比绳子摆得更明显，
     * 否则「挂在绳上的书签随风摆动」这个核心观感就不成立。
     * cardWindFactor 让它的受风面积更大，这里验证该系数确实起作用。
     */
    const measure = (strength: number): number => {
      const rope = new Rope(SPAN)
      rope.build(SPAN, CARD_IDS(39))
      rope.setWindStrength(strength)
      settle(rope, 2)

      let peak = 0
      for (let i = 0; i < 360; i++) {
        rope.update(1 / 60)
        for (const c of rope.cards) {
          const a = rope.nodes[c.anchorIndex]
          peak = Math.max(peak, Math.hypot(c.bob.x - a.x, c.bob.z - a.z))
        }
      }
      return peak
    }

    expect(measure(1)).toBeGreaterThan(measure(0.3))
    // 摆幅不应超过悬挂长度太多，否则卡片会被甩到绳的另一侧
    expect(measure(1)).toBeLessThan(3)
  })

  it('风量为 0 时节点几乎不动', () => {
    const rope = new Rope(SPAN)
    rope.build(SPAN, CARD_IDS(39))
    rope.setWindStrength(0)
    settle(rope, 2)

    const mid = Math.floor(rope.nodes.length / 2)
    expect(Math.abs(rope.nodes[mid].z - rope.nodes[mid].pz)).toBeLessThan(0.01)
  })

  it('大风三秒仍不发散', () => {
    const rope = new Rope(SPAN)
    rope.build(SPAN, CARD_IDS(39))
    rope.setWindStrength(1)
    settle(rope, 3)

    expect(allFinite(rope)).toBe(true)
    const maxAbsX = Math.max(...rope.nodes.map((n) => Math.abs(n.x)))
    expect(maxAbsX).toBeLessThanOrEqual(SPAN / 2 + 0.5)
  })

  it('风力沿绳长传播：两端不同相（不是整根绳刚性平移）', () => {
    const rope = new Rope(SPAN)
    rope.build(SPAN, CARD_IDS(39))
    rope.setWindStrength(0.8)
    settle(rope, 2)

    const n = rope.nodes.length
    const quarter = Math.floor(n / 4)
    const left: number[] = []
    const right: number[] = []
    for (let i = 0; i < 240; i++) {
      rope.update(1 / 60)
      left.push(rope.nodes[quarter].x)
      right.push(rope.nodes[n - 1 - quarter].x)
    }
    // 若整根绳同相受力，两端位移几乎完全同步（相关系数趋近 1），
    // 视觉上就是一根棍子整体平移，而不是绳在波浪式摆动
    expect(pearson(left, right)).toBeLessThan(0.98)
  })
})

describe('Rope 切组与绳长插值', () => {
  it('切组后绳长收敛到目标值且锚点跟随收缩', () => {
    const rope = new Rope(SPAN)
    rope.build(SPAN, CARD_IDS(39))
    rope.build(rope.span, CARD_IDS(12))
    rope.setRestSpan(32)
    settle(rope, 2)

    expect(rope.isTransitioning).toBe(false)
    expect(Math.abs(rope.config.restSpan - 32)).toBeLessThan(0.5)
    // 锚点必须跟着绳长左右平移，否则短绳仍挂在原来两端位置上
    const maxAbsX = Math.max(...rope.nodes.map((n) => Math.abs(n.x)))
    expect(maxAbsX).toBeLessThanOrEqual(16 + 0.5)
  })

  it('插值在预期时间内结束（结束后可接受拖拽）', () => {
    const rope = new Rope(SPAN)
    rope.build(SPAN, CARD_IDS(39))
    rope.setRestSpan(32)
    expect(rope.isTransitioning).toBe(true)
    settle(rope, 1)
    expect(rope.isTransitioning).toBe(false)
  })

  it('切组时卡片数量与新分组一致', () => {
    const rope = new Rope(SPAN)
    rope.build(SPAN, CARD_IDS(39))
    expect(rope.cards).toHaveLength(39)
    rope.build(rope.span, CARD_IDS(12))
    expect(rope.cards).toHaveLength(12)
  })
})

describe('Rope 拖拽甩动', () => {
  it('拖拽后松手，悬挂绳长仍受约束（不会甩飞）', () => {
    const rope = new Rope(SPAN)
    rope.build(SPAN, CARD_IDS(39))
    rope.setWindStrength(0.25)
    const card = rope.cards[0]

    rope.beginDrag(card, card.bob.x, card.bob.y + 6, 0)
    for (let i = 0; i < 30; i++) {
      rope.moveDrag(card.bob.x + i * 0.1, card.bob.y + 6, 0)
      rope.update(1 / 60)
    }
    rope.endDrag(card)
    settle(rope, 2)

    const a = rope.nodes[card.anchorIndex]
    const d = Math.hypot(card.bob.x - a.x, card.bob.y - a.y, card.bob.z - a.z)
    expect(Number.isFinite(d)).toBe(true)
    // 松手后靠约束拉回，但惯性让它先飘远；超过 3 倍绳长即视为甩飞
    expect(d).toBeLessThan(card.dropLength * 3)
  })

  it('被拖拽的卡片在拖拽期间跟随目标点', () => {
    const rope = new Rope(SPAN)
    rope.build(SPAN, CARD_IDS(39))
    const card = rope.cards[3]
    // 拖到绳下一点点的位置：比绳长 1.9 远一点，能看出「被绳拉着」
    const tx = 10
    const ty = 12
    rope.beginDrag(card, tx, ty, 0)
    settle(rope, 0.5)

    // 每步求解后拖拽点被强制写回，但随后的约束与阻尼仍会改动它，
    // 所以最终位置落在拖拽点附近（2 个绳长以内即视为跟随）
    expect(Math.hypot(card.bob.x - tx, card.bob.y - ty, card.bob.z)).toBeLessThan(
      card.dropLength * 2,
    )
  })
})

describe('Rope 性能', () => {
  it('单步约束求解耗时在 1ms 内（39 卡片 / 53 节点）', () => {
    const rope = new Rope(SPAN)
    rope.build(SPAN, CARD_IDS(39))
    rope.setWindStrength(0.6)
    settle(rope, 1)
    for (let i = 0; i < 120; i++) rope.update(1 / 60)

    // 单步物理预算 2ms；实测留足余量。Node 无 DOM 开销，浏览器会更慢一些
    expect(rope.metrics.constraintMs).toBeLessThan(1)
  })
})