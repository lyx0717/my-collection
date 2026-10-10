/**
 * 经典 Perlin 3D 噪声（Ken Perlin 的改进版，非strict permutation table 版本）。
 *
 * 为什么要噪声而不用正弦波：
 * 正弦叠加出来的风是「规律」的，看两秒就知道周期——像秋千，不像自然界的风。
 * 真实的空气流动既不规则也不重复，Perlin 噪声的梯度平滑性刚好提供这种
 * 「看起来随机、实际连续」的质感，这也是柏林风场的来源。
 *
 * 实现要点：
 * - fade(t) = 6t⁵-15t⁴+10t³，这个五次曲线保证一阶、二阶导数在格点处都为0，
 *   否则插值会在格点处出现肉眼可见的折角。用更低次的多项式（如 3t²-2t³）会折。
 * - 用哈希表代替随机排列表：结果一样，但只需256 个条目而非 512，
 *   且不会出现「相同排列导致某些方向噪声恒为0」的坏情况。
 */

const PERM = new Uint8Array(512)
const GRAD = new Float32Array(512 * 3)

;(function buildTables() {
  // 固定种子的 xorshift，保证每次刷新噪声序列一致——
  // 否则开发时看到的风向和用户看到的不一样，无法互相描述问题。
  let seed = 1337
  const rand = (): number => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return ((seed >>> 0) % 100000) / 100000
  }

  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  // Fisher-Yates 洗牌
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const t = p[i]
    p[i] = p[j]
    p[j] = t
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]

  // 12 个标准梯度方向（Perlin 论文推荐集），归一化到单位长度
  const grads: Array<[number, number, number]> = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
  ]
  for (let i = 0; i < 512; i++) {
    const g = grads[PERM[i] % 12]
    const len = Math.hypot(g[0], g[1], g[2])
    GRAD[i * 3] = g[0] / len
    GRAD[i * 3 + 1] = g[1] / len
    GRAD[i * 3 + 2] = g[2] / len
  }
})()

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function gradDot(hash: number, x: number, y: number, z: number): number {
  const i = hash * 3
  return GRAD[i] * x + GRAD[i + 1] * y + GRAD[i + 2] * z
}

/** 单点噪声，返回约 [-1, 1] 的值。 */
export function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const xf = x - xi
  const yf = y - yi
  const zf = z - zi

  const X = xi & 255
  const Y = yi & 255
  const Z = zi & 255

  const u = fade(xf)
  const v = fade(yf)
  const w = fade(zf)

  const A = PERM[X] + Y
  const AA = PERM[A & 255] + Z
  const AB = PERM[(A + 1) & 255] + Z
  const B = PERM[(X + 1) & 255] + Y
  const BA = PERM[B & 255] + Z
  const BB = PERM[(B + 1) & 255] + Z

  const x1 = lerp(
    gradDot(PERM[AA & 255], xf, yf, zf),
    gradDot(PERM[BA & 255], xf - 1, yf, zf),
    u,
  )
  const x2 = lerp(
    gradDot(PERM[AB & 255], xf, yf - 1, zf),
    gradDot(PERM[BB & 255], xf - 1, yf - 1, zf),
    u,
  )
  const y1 = lerp(x1, x2, v)

  const x3 = lerp(
    gradDot(PERM[(AA + 1) & 255], xf, yf, zf - 1),
    gradDot(PERM[(BA + 1) & 255], xf - 1, yf, zf - 1),
    u,
  )
  const x4 = lerp(
    gradDot(PERM[(AB + 1) & 255], xf, yf - 1, zf - 1),
    gradDot(PERM[(BB + 1) & 255], xf - 1, yf - 1, zf - 1),
    u,
  )
  const y2 = lerp(x3, x4, v)

  return lerp(y1, y2, w)
}

/**
 * 分形叠加（fBm）：多个倍频噪声相加，模拟不同尺度的气流。
 * octaves 越多细节越丰富、计算量线性增长；3 个倍频对绳子摆动已足够。
 */
export function fbm3(x: number, y: number, z: number, octaves = 3): number {
  let sum = 0
  let amp = 1
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += noise3(x, y, z) * amp
    norm += amp
    amp *= 0.5
    // 每倍频坐标翻倍 —— 这让细节出现在越来越小的空间尺度上
    x *= 2.03
    y *= 2.03
    z *= 2.03
  }
  return sum / norm
}