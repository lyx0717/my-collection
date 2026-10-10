import { fbm3 } from './noise'

/**
 * 风场。
 *
 * 设计要点（这几条决定了摆动看起来是「风」还是「随机抖动」）：
 *
 * 1. **沿绳长必须有相位差。**
 *    如果整根绳同一时刻受同一股力，绳子会像刚性棍子整体平移——完全没有
 *    甩动感。做法是采样点的 x 坐标随绳的累计弧长递增，风从一端向另一端
 *    「传过去」，于是近端先动、远端滞后，绳子自然形成波浪。
 *
 * 2. **主频要低。**
 *    0.25Hz 左右的摆动周期（约 4 秒）接近真实晾衣绳；1Hz 以上会显得急躁，
 *    正是之前动效「傻快」的同一种毛病，只是换了个物理载体。
 *
 * 3. **风力是加速度，不是速度。**
 *    直接按速度施加会让绳子被推着持续偏移；作为加速度则风停后自然回摆。
 *
 * 4. **x/z 分量比例固定为 1 : 0.35。**
 *    绳子主要沿绳长方向摆动（x），垂直方向分量只用于制造轻微的
 *    前后错落，避免所有卡片在同一平面里整齐划一地荡。
 */

/** 单点风力。y 是主摆动轴（与重力同轴），x/z 只做相位与前后错落。 */
export interface WindForce {
  ax: number
  ay: number
  az: number
}

export interface WindParams {
  /** 0 = 静谧，1 = 大风。UI 滑杆直接映射到这个值 */
  strength: number
  /** 全局时间，仅由物理循环推进 */
  time: number
  /** 绳的累计弧长坐标，风沿它传播 */
  arc: number
  /** 风的传播速度（弧长单位/秒），越大越像一阵阵吹而非同时起 */
  travelSpeed: number
  /** 阵风的主频（Hz），低频才有舒缓感 */
  baseHz: number
  /** 湍流强度，叠加高频分量制造不规则的细节 */
  turbulence: number
  /** 垂直方向分量占比 */
  verticalRatio: number
}

export const DEFAULT_WIND: WindParams = {
  strength: 0.25,
  time: 0,
  arc: 0,
  travelSpeed: 26,
  baseHz: 0.25,
  turbulence: 0.35,
  verticalRatio: 0.35,
}

/**
 * 返回某一弧长位置处的风力加速度。
 *
 * @param phase 该节点的风场相位偏移，用于让不同绳段（未来若多绳）互不同步
 */
export function sampleWind(p: WindParams, phase = 0): WindForce {
  const s = p.strength
  if (s <= 0.001) return { ax: 0, ay: 0, az: 0 }

  // 沿绳长传播的主分量：采样 x 随弧长推进，形成「风从一端吹到另一端」
  const travel = p.arc * 0.045 - p.time * p.travelSpeed * 0.045 + phase
  const t = p.time * p.baseHz * Math.PI * 2

  // 主摆动：低频正弦，周期约 4 秒（baseHz 0.25Hz），接近真实晾衣绳。
  // 这是有节律的「摆」，不是抖动。
  const main = Math.sin(t + travel * 2.2)
  // 阵风包络：低频噪声调制主摆动强度，一阵强一阵弱
  const gust = fbm3(travel, t * 0.55 + phase, 0.7, 3)
  // 湍流：高频小振幅细节
  const turb = fbm3(travel * 3.1 + 11.3, t * 4.2, phase * 1.7, 2)

  /**
   * 风力幅值。取重力（26）的约 3.5倍。
   *
   * 为什么不是「小于重力」：绳有弹性，大幅风力下绳会被吹得更直，
   * 而约束始终把绳拉回固定弧长，两者平衡后 y 向偏移稳定在几倍于风力幅值处。
   * 实测幅值 15 时 y 向摆幅仅 1.3（绳长 78），在屏幕上几乎看不出摆动。
   * 大于重力是合理的 —— 真实阵风把晾衣绳吹得几乎水平是常见现象。
   */
  const amp = 90 * s
  const envelope = 0.72 + gust * 0.55

  /**
   * y 是主摆动轴。
   *
   * 关键物理事实：绳沿 x（绳长方向）几乎没有摆动自由度 —— 两端锚点固定、
   * 绳长恒定，沿绳长移动不产生形变，约束不提供回复力，实测摆幅仅 0.01。
   *
   * 真实晾衣绳的摆动是「绳偏离水平线后被重力拉回」的单摆式摆动，
   * 发生在 y 方向。所以横向风力必须加在 y 上（与重力同轴），
   * 风力与重力在该轴上竞争，绳才会被吹出弧度并往复摆动。
   */
  const ay = amp * envelope * (main + turb * p.turbulence * main)

  /**
   * x 与 z：沿绳长的相位错落与前后错落。
   * 它们不产生大幅摆动，但让相邻节点不同步 —— 否则整根绳会像刚性棍子
   * 整体平移，视觉上失去绳的柔性。
   */
  const drift = Math.sin(t * 1.13 + travel * 1.9 + 0.7)
  const ax = amp * 0.16 * envelope * (drift + gust * 0.4)
  const az = amp * p.verticalRatio * envelope * (drift + turb * p.turbulence * 0.5)

  return { ax, ay, az }
}

/** 每步推进风场时间。固定步长下累加真实时间，保证与帧率无关。 */
export function advanceWind(p: WindParams, dt: number): void {
  p.time += dt
}