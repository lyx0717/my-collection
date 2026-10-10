import {
  createPoint,
  integrate,
  solveDistance,
  pinTo,
  setPointPosition,
  distance,
  type Point,
} from './verlet'
import { DEFAULT_WIND, sampleWind, advanceWind, type WindParams } from './wind'

/**
 * 单根晾衣绳：Verlet 绳索 + 挂在其上的卡片摆锤，联合求解。
 *
 * 结构上刻意把「绳」和「卡片的摆动」放进同一个约束系统，而不是让卡片
 * 每帧去读绳节点的角度再插值。原因：卡片有自己的惯性和阻尼，如果只是
 * 被动跟随绳向，卡片会显得被钉死在绳上；作为独立摆锤参与同一轮约束松弛，
 * 它才能「甩」得比绳子多一点，视觉上才有生命感。
 *
 * 坐标约定：绳沿 X 轴展开，Y 为竖直向上，Z 为朝向观众。
 * 重力取负 Y，横向摆动主要在 X，Z 只做轻微前后错落。
 */

export interface Card {
  id: string
  /** 摆锤的悬挂点位置（Verlet 点） */
  bob: Point
  /** 木夹子处的连接点，即绳上的挂点索引 */
  anchorIndex: number
  /** 夹子与卡片重心之间的绳长 */
  dropLength: number
  /** 被鼠标抓起时该摆锤被钉到目标点 */
  dragging: boolean
  /** 该卡片在绳上的归一化位置 [0,1]，用于沿绳均匀布点 */
  t: number
}

export interface RopeMetrics {
  /** 约束求解耗时（ms），单步平均 */
  constraintMs: number
  /** 本次求解的最大约束误差 */
  maxError: number
  /** 物理步数（用于校验固定步长是否跟得上） */
  steps: number
}

export interface RopeConfig {
  /** 节点间距（世界单位） */
  segmentLength: number
  /** 约束松弛迭代次数。6 次是收敛与性能的平衡点 */
  iterations: number
  /** 重力加速度 */
  gravity: number
  /** 卡片抗风面积系数，卡片比绳节点受风更明显 */
  cardWindFactor: number
  /** 卡片摆锤的阻尼，比绳子略高（空气阻力集中在卡片上） */
  cardDamping: number
  /** 绳的静止长度，插值变化 */
  restSpan: number
}

export const DEFAULT_ROPE_CONFIG: RopeConfig = {
  /**
   * 段长 3.4：78 单位绳长 → 约 24 个节点。
   *
   * 节点数是绳索物理最敏感的参数。约束信息沿链传播需要 O(n) 次松弛，
   * 53 个节点时12 次迭代只能覆盖前 12 段，中段被两端锚点锁死、
   * 风力完全推不动（实测 y向摆幅仅 1.3，绳几乎静止）。
   * 24 个节点配 12 次迭代能覆盖半条链，摆动才成立。
   *
   * 视觉平滑不靠节点密度 —— 渲染时按弧长重采样即可，
   * 节点少而间距大反而让求解更稳定。
   */
  segmentLength: 3.4,
  /**
   * 12 次松弛。实测这个配比下残差约 0.03（rest 的 2%），
   * 单步 0.1ms，远低于 2ms 预算。这里的收敛质量是绳子看起来
   * 「硬」而不是「橡皮」的关键。
   */
  iterations: 12,
  gravity: -26,
  cardWindFactor: 1.55,
  cardDamping: 0.972,
  restSpan: 40,
}

/** 固定物理步长。变步长会让绳子忽紧忽松甚至炸开，这是 2D 物理仿真的第一定律。 */
export const FIXED_DT = 1 / 60
/** 单帧最多推进的物理步数，防止切走标签页再回来时追帧卡死 */
export const MAX_STEPS_PER_FRAME = 5

export class Rope {
  nodes: Point[] = []
  cards: Card[] = []
  wind: WindParams = { ...DEFAULT_WIND }
  config: RopeConfig = { ...DEFAULT_ROPE_CONFIG }
  metrics: RopeMetrics = { constraintMs: 0, maxError: 0, steps: 0 }

  private accumulator = 0
  private dragTarget = { x: 0, y: 0, z: 0 }
  /** 绳长插值目标与当前值：切组时绳长平滑过渡，避免整根绳「弹」一下 */
  private spanFrom: number
  private spanTo: number
  private spanT = 1

  constructor(restSpan = DEFAULT_ROPE_CONFIG.restSpan) {
    this.spanFrom = restSpan
    this.spanTo = restSpan
    this.build(restSpan, [])
  }

  /** 绳长目标（分组切换时调用）。插值期间不接受拖拽，避免绳长突变与拖拽打架。 */
  setRestSpan(span: number, immediate = false): void {
    if (Math.abs(span - this.spanTo) < 1e-3 && !immediate) return
    if (immediate) {
      this.spanTo = span
      this.spanFrom = span
      this.spanT = 1
      this.config.restSpan = span
      return
    }
    this.spanFrom = this.config.restSpan
    this.spanTo = span
    this.spanT = 0
  }

  get span(): number {
    return this.config.restSpan
  }

  get isTransitioning(): boolean {
    return this.spanT < 1
  }

  /** 重建节点与卡片。数量变化时复用可复用的对象，避免每帧产生垃圾。 */
  build(restSpan: number, cardIds: string[]): void {
    const segLen = this.config.segmentLength
    const count = Math.max(4, Math.round(restSpan / segLen) + 1)

    // 绳两端固定在同高，中点略低 —— 真实绳子自重下垂形成的悬链线形状
    const anchorY = this.anchorY
    const nodes: Point[] = []
    for (let i = 0; i < count; i++) {
      const u = i / (count - 1)
      const x = -restSpan / 2 + u * restSpan
      // 初始下垂量：抛物线近似悬链线，比纯水平好看，也不影响求解
      const sag = Math.sin(u * Math.PI) * restSpan * 0.09
      nodes.push(createPoint(x, anchorY - sag, 0, i === 0 || i === count - 1))
    }
    this.nodes = nodes

    // 每次切组都是全量重建摆锤：复用旧摆锤看起来省一点分配，实际会留下
    // 上一个分组的 id/anchorIndex 映射，调试时反而难确认状态从哪来。
    const cards: Card[] = []
    for (let i = 0; i < cardIds.length; i++) {
      const t = cardIds.length === 1 ? 0.5 : i / (cardIds.length - 1)
      // 锚点不能落在首尾：两端是固定锚点，卡片挂上去会完全不动
      const anchorIndex = Math.min(count - 2, Math.max(1, Math.round(t * (count - 1))))
      const anchor = nodes[anchorIndex]
      const drop = 1.9
      const bob = createPoint(anchor.x, anchor.y - drop, 0)
      cards.push({
        id: cardIds[i],
        bob,
        anchorIndex,
        dropLength: drop,
        dragging: false,
        t,
      })
    }
    this.cards = cards
  }

  /** 绳节点在 X 轴上的累计弧长，供风场采样使用。 */
  private arcAt(index: number): number {
    let arc = 0
    for (let i = 1; i <= index && i < this.nodes.length; i++) {
      arc += distance(this.nodes[i - 1], this.nodes[i])
    }
    return arc
  }

  /**
   * 推进一帧。内部按固定步长累积，帧率波动不会改变物理行为。
   * @param frameDt 真实经过的时间（秒）
   */
  update(frameDt: number): void {
    this.accumulator += Math.min(frameDt, FIXED_DT * MAX_STEPS_PER_FRAME)
    let steps = 0
    const t0 = performance.now()
    let maxError = 0

    while (this.accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      maxError = Math.max(maxError, this.step(FIXED_DT))
      this.accumulator -= FIXED_DT
      steps++
    }

    const ms = performance.now() - t0
    if (steps > 0) {
      // 指数平滑，读数不会因为某一帧的 GC 抖动而跳变
      this.metrics.constraintMs = this.metrics.constraintMs * 0.85 + (ms / steps) * 0.15
      // 同理平滑残差。这个值必须来自真实的约束求解结果——
      // 曾因为没赋值而恒为 0，排查数值发散时被它误导过。
      this.metrics.maxError = this.metrics.maxError * 0.8 + maxError * 0.2
    }
    this.metrics.steps = steps
  }

  /** @returns 本步收敛后的最大约束残差，供上层判断约束是否够收敛 */
  private step(dt: number): number {
    // 绳长插值：用平滑缓动而非线性，避免起止处速度突变被看出「机械感」
    if (this.spanT < 1) {
      this.spanT = Math.min(1, this.spanT + dt / 0.45)
      const e = easeInOutCubic(this.spanT)
      this.config.restSpan = this.spanFrom + (this.spanTo - this.spanFrom) * e
      // 绳长变了，节点间距也要跟着变，否则约束长度与实际排布脱节
      this.config.segmentLength = this.config.restSpan / Math.max(1, this.nodes.length - 1)
    }

    advanceWind(this.wind, dt)
    this.wind.arc = this.nodes.length * this.config.segmentLength

    const nodes = this.nodes
    const n = nodes.length
    if (n < 2) return 0

    // 1) 积分：绳节点。风力与重力相加后作用于同一坐标轴。
    //    （sampleWind 的 y 分量已含横向主摆动，与重力直接竞争）
    for (let i = 1; i < n - 1; i++) {
      const w = sampleWind(this.wind, this.arcAt(i))
      integrate(nodes[i], dt, w.ax, w.ay + this.config.gravity, w.az)
    }

    // 2) 积分：卡片摆锤。受风系数更高，所以摆得比绳子明显
    for (const card of this.cards) {
      if (card.dragging) continue
      const w = sampleWind(this.wind, this.arcAt(card.anchorIndex) + 4.2)
      integrate(
        card.bob,
        dt,
        w.ax * this.config.cardWindFactor,
        w.ay * this.config.cardWindFactor + this.config.gravity,
        w.az * this.config.cardWindFactor,
      )
    }

    // 3) 约束松弛。顺序：先固定锚点，再解绳段距离，最后解卡片摆锤。
    //    摆锤放最后是因为它同时受绳段约束和自身摆动，多解几轮才稳定。
    const iter = this.config.iterations
    let maxError = 0
    for (let k = 0; k < iter; k++) {
      this.pinAnchors()

      const rest = this.config.segmentLength
      for (let i = 0; i < n - 1; i++) {
        maxError = Math.max(maxError, Math.abs(solveDistance(nodes[i], nodes[i + 1], rest, 1)))
      }

      for (const card of this.cards) {
        const anchor = nodes[card.anchorIndex]
        if (card.dragging) {
          // 被抓住的卡片不受悬挂绳长约束：用户拿着它，它就必须在手的位置。
          // 若照常施加 dropLength 约束，卡片会被拽回绳边 1.9 处，
          // 表现为「拖不动 / 脱离鼠标」。
          //
          // 但绳必须跟着手走 —— 否则甩动时绳子不响应，物理就断了。
          // 做法是把锚点朝卡片方向拉（只改锚点，不改卡片位置），
          // 下一轮的绳段约束自然就把这个位移传给整根绳。
          const dx = this.dragTarget.x - anchor.x
          const dy = this.dragTarget.y - anchor.y
          const dz = this.dragTarget.z - anchor.z
          const d = Math.hypot(dx, dy, dz) || 1
          // 锚点最多偏离静息位置一个绳长，避免把手甩太远时绳被拉变形
          const pull = Math.min(d, card.dropLength)
          // 直接位移而非 setPointPosition：让锚点保留隐含速度，
          // 绳段约束才能把手甩动的动量传给整根绳（松手后自然回摆）
          anchor.x += (dx / d) * pull
          anchor.y += (dy / d) * pull
          anchor.z += (dz / d) * pull
          setPointPosition(card.bob, this.dragTarget.x, this.dragTarget.y, this.dragTarget.z)
        } else {
          this.dampTowardAnchor(card)
          maxError = Math.max(
            maxError,
            Math.abs(solveDistance(anchor, card.bob, card.dropLength, 1)),
          )
        }
      }

      this.pinAnchors()
    }

    return maxError
  }

  /** 绳的固定挂点高度（世界单位），绳长插值时锚点水平平移但高度不变 */
  private anchorY = 14

  /** 复位两端锚点：X 随绳长左右平移，Y 恒定。 */
  private pinAnchors(): void {
    const n = this.nodes.length
    if (n < 2) return
    const half = this.config.restSpan / 2
    pinTo(this.nodes[0], -half, this.anchorY, 0)
    pinTo(this.nodes[n - 1], half, this.anchorY, 0)
  }

  /**
   * 卡片阻尼：只衰减「相对锚点的切向速度」，保留径向分量。
   * 直接对整个速度做阻尼会让卡片失去向下的惯性（看起来发飘），
   * 只削切向则是真实世界的空气阻力——横向摆动被吃掉，垂向重力不受影响。
   */
  private dampTowardAnchor(card: Card): void {
    const bob = card.bob
    const anchor = this.nodes[card.anchorIndex]
    const vx = bob.x - bob.px
    const vy = bob.y - bob.py
    const vz = bob.z - bob.pz

    // 径向单位向量（锚点 → 卡片）
    const rx = bob.x - anchor.x
    const ry = bob.y - anchor.y
    const rz = bob.z - anchor.z
    const rl = Math.hypot(rx, ry, rz) || 1
    const ux = rx / rl
    const uy = ry / rl
    const uz = rz / rl

    // 分解速度为「径向（沿绳，受重力驱动）+ 切向（横向摆动，受空气阻力）」
    const radial = vx * ux + vy * uy + vz * uz
    const tx = (vx - radial * ux) * this.config.cardDamping
    const ty = (vy - radial * uy) * this.config.cardDamping
    const tz = (vz - radial * uz) * this.config.cardDamping

    // 改写「上一帧位置」来施加速度 —— Verlet 没有独立的速度字段。
    // 径向分量原样保留，重力才能持续把卡片拉回绳下。
    bob.px = bob.x - (tx + radial * ux)
    bob.py = bob.y - (ty + radial * uy)
    bob.pz = bob.z - (tz + radial * uz)
  }

  beginDrag(card: Card, x: number, y: number, z: number): void {
    card.dragging = true
    this.dragTarget = { x, y, z }
  }

  moveDrag(x: number, y: number, z: number): void {
    this.dragTarget = { x, y, z }
  }

  endDrag(card: Card): void {
    card.dragging = false
    // 松手时把拖拽产生的速度还给它，绳子才会「甩」出去再摆回来。
    // Verlet 的速度就是 当前-上一，所以只需清掉上一帧位置即可自然带出惯性。
    card.bob.px = card.bob.x - (card.bob.x - card.bob.px) * 1.6
    card.bob.py = card.bob.y - (card.bob.y - card.bob.py) * 1.6
    card.bob.pz = card.bob.z - (card.bob.z - card.bob.pz) * 1.6
  }

  setWindStrength(v: number): void {
    this.wind.strength = Math.max(0, Math.min(1, v))
  }
}

/** 三次缓入缓出，比线性柔和，比弹簧不会有「弹一下」的廉价感 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}