/**
 * 极简 Verlet 积分器与距离约束。
 *
 * 为什么自研而不用 Matter.js / Rapier：
 * 我们的场景只有「一根绳挂 N 个摆锤」，约束仅有一种——两点间固定距离。
 * 刚体碰撞、关节马达、复合形状全是用不上��能力，换来的是 80KB+ 体积
 * 和与CSS3DObject 矩阵同步的额外适配成本。这里约 120 行即可完全掌控
 * 阻尼、风力与迭代次数。
 *
 * 核心约定：
 * - 位置以「当前帧」与「上一帧」两份坐标保存，速度隐含在两者之差里。
 *   因此固定步长是硬要求：直接把可变deltaTime 喂进来，帧率波动会
 *   让绳子忽紧忽松，严重时炸开。
 * - 锚点（pinned）节点在积分阶段跳过、约束阶段强制复位。
 */

export interface Point {
  x: number
  y: number
  z: number
  /** 上一物理帧的位置，用于反推速度 */
  px: number
  py: number
  pz: number
  /** 锚点不参与积分，被约束强行拉回原位 */
  pinned: boolean
  /** 每帧衰减后的速度模，用于调试观感是否过冲 */
  speed: number
}

export function createPoint(x: number, y: number, z = 0, pinned = false): Point {
  return { x, y, z, px: x, py: y, pz: z, pinned, speed: 0 }
}

export function setPointPosition(p: Point, x: number, y: number, z: number): void {
  p.px = p.x
  p.py = p.y
  p.pz = p.z
  p.x = x
  p.y = y
  p.z = z
}

/** 单步积分：位置 += 速度 + 加速度·dt²。加速度已含重力与风力。 */
export function integrate(p: Point, dt: number, ax: number, ay: number, az: number): void {
  if (p.pinned) return
  const vx = (p.x - p.px) * DAMPING
  const vy = (p.y - p.py) * DAMPING
  const vz = (p.z - p.pz) * DAMPING
  p.speed = Math.hypot(vx, vy, vz)

  p.px = p.x
  p.py = p.y
  p.pz = p.z
  p.x += vx + ax * dt * dt
  p.y += vy + ay * dt * dt
  p.z += vz + az * dt * dt
}

/**
 * 速度阻尼。每帧衰减一点点即可让摆动收敛；过大（>0.99）会像糖浆，
 * 过小（<0.9）则永远停不下来，看起来像一直在抽。
 */
const DAMPING = 0.985

/**
 * 求解两点间距离约束。
 *
 * 用对称位移修正：两端各承担一半误差，这样不会像「只移动一端」那样
 * 把整根绳往一侧拉。两端都锚定时误差无法消除，按stiffness 折中。
 *
 * @returns 修正后残余误差，供上层观测约束是否收敛
 */
export function solveDistance(a: Point, b: Point, restLength: number, stiffness = 1): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dz = b.z - a.z
  const distSq = dx * dx + dy * dy + dz * dz
  // 完全重合时距离为0，法线无定义，跳过以免除零产生 NaN
  if (distSq < 1e-12) return 0

  const dist = Math.sqrt(distSq)
  const err = dist - restLength
  const diff = (err / dist) * stiffness

  const aFixed = a.pinned
  const bFixed = b.pinned
  if (aFixed && bFixed) return err

  if (aFixed || bFixed) {
    // 只有一端固定时，全部修正量由自由端承担。
    // 符号推导：误差 err>0 表示两点太远，自由端必须朝固定端移动，
    // 即沿 (fixed - free) 方向走 err/dist，即 b -= d * (err/dist)。
    if (aFixed) {
      b.x -= dx * diff
      b.y -= dy * diff
      b.z -= dz * diff
    } else {
      a.x += dx * diff
      a.y += dy * diff
      a.z += dz * diff
    }
    return err
  }

  // 两端都自由：对称分担误差，避免整根绳被拉向一端
  a.x += dx * diff * 0.5
  a.y += dy * diff * 0.5
  a.z += dz * diff * 0.5
  b.x -= dx * diff * 0.5
  b.y -= dy * diff * 0.5
  b.z -= dz * diff * 0.5
  return err
}

/** 把点强制拉回锚定位置，并清零速度——锚点每次求解后都要复位，否则会被风推走。 */
export function pinTo(p: Point, x: number, y: number, z: number): void {
  p.x = x
  p.y = y
  p.z = z
  p.px = x
  p.py = y
  p.pz = z
  p.speed = 0
}

/** 计算两点距离，绳索渲染与卡片挂载都要用。 */
export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
}