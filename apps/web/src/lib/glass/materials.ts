import type { LensOptions } from './lens'

/**
 * 液态玻璃的折射参数，按表面尺寸分档。
 *
 * 只有「大到能容下一条折射带」的表面才值得挂位移图：
 * 折射带 rim 会占掉短边的一部分，表面越小、能用来显示内容的部分越少，
 * 而且位移会采到图外的透明区 —— 90×36 的选中片就是这么废掉的（见 index.css）。
 * 所以按钮一类的控件只用 CSS 画 rim 与高光，不挂 lens。
 */
export const LENS = {
  /** 分组胶囊：宽而扁，最长的一档边带，折射最明显 */
  nav: { rim: 30, edge: 1, power: 2.6, dispersion: 0.12 },
  /** 通栏顶栏：只有上下两条边带，rim 收窄以免糊掉顶栏内容 */
  bar: { rim: 24, edge: 1.05, power: 2.4, dispersion: 0.14 },
} satisfies Record<string, LensOptions>

export type LensMaterial = keyof typeof LENS