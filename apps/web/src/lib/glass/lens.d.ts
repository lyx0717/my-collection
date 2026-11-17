export interface LensOptions {
  /** 折射带宽度（CSS px），默认 40；小面板会被自动收窄到短边的 1/3.5 */
  rim?: number
  /** 位移强度，默认 1.1 */
  edge?: number
  /** 衰减曲线，默认 2.6 */
  power?: number
  /** 色散，默认 0.15；0 表示单通道一次位移 */
  dispersion?: number
  /** 覆盖圆角，默认读 CSS border-radius */
  radius?: number | null
  /** 圆角指数，默认读 CSS corner-*-shape；2 是正圆 */
  corner?: number | null
  /** 开关：false 时撤掉滤镜但保留实例 */
  enabled?: boolean
  /** 写入的 CSS 变量名，默认 --glass-lens */
  property?: string
}

export interface LiquidGlass {
  /** Chromium 才会画 backdrop-filter: url(#…)，其它浏览器恒为 false */
  supported: boolean
  /** 当前折射带实际宽度 */
  bezel: number
  update(next?: LensOptions): void
  refresh(): void
  destroy(): void
}

export function liquidGlass(el: HTMLElement, options?: LensOptions): LiquidGlass
export function isLensSupported(): boolean
export const LENS_DEFAULTS: Required<LensOptions>