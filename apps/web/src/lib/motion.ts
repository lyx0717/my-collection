import type { Transition, Variants } from 'motion/react'

/**
 * 全站动效基线（见 design/MOTION.md）。
 * 唯一真源：组件内禁止散写 duration / easing / spring，统一从这里取。
 * 尊重系统「减少动态」由根节点的 <MotionConfig reducedMotion="user"> 负责。
 *
 * 调校取向：优雅优先于响应速度。
 * 曲线一律用柔和 S 型（起步有缓入、尾段稳收），禁用 expo-out —— 后者前 13%
 * 时间就已完成一半位移，是「傻快」的数学根源；时长也刻意比 Apple/Linear 略长一档，
 * 让动作有「被看见」的过程而不是啪一下到位。
 */

type Cubic = [number, number, number, number]

/** 四档时长（秒）——比初版整体放慢约 55% */
export const DUR = {
  1: 0.2, // 微反馈：按下、星标弹动
  2: 0.32, // 默认：hover、chip
  3: 0.45, // 弹窗、抽屉、视图切换
  4: 0.6, // 进场单项、拖拽落位
} as const

/**
 * 缓动：柔和 S 型。
 * out   —— 一切「进入」：起步缓、中段推、尾段收，不抢跑也不拖沓
 * inOut —— 位置互换：两端都慢，中间最快
 * soft  —— 微反馈：只在小幅度元素上用，比 out 再柔一档
 */
export const EASE: { out: Cubic; inOut: Cubic; soft: Cubic } = {
  out: [0.3, 0.12, 0.2, 1],
  inOut: [0.45, 0.05, 0.35, 1],
  soft: [0.34, 0.14, 0.22, 1],
}

/** 同曲线的 CSS 写法：给 dnd-kit 等只接受字符串 easing 的 API 用 */
export const EASE_CSS: { out: string; inOut: string; soft: string } = {
  out: 'cubic-bezier(0.3, 0.12, 0.2, 1)',
  inOut: 'cubic-bezier(0.45, 0.05, 0.35, 1)',
  soft: 'cubic-bezier(0.34, 0.14, 0.22, 1)',
}

/**
 * 拖拽落位：一次柔和回弹，不弹两下。
 * 初版 stiffness 420 太脆 —— 落位像「弹射」，这里降到 260 让它「沉」回原位。
 */
export const SPRING: Transition = { type: 'spring', stiffness: 260, damping: 30, mass: 1 }
/** 拖拽跟手：仍然跟手，但降一档刚度，起点不那么窜 */
export const SPRING_FOLLOW: Transition = { type: 'spring', stiffness: 520, damping: 42 }

/** 错峰：间隔由 20ms 放到 34ms，一波铺开像「依次浮现」而不是「整块弹」 */
export const STAGGER_LIMIT = 12
export const STAGGER_STEP = 0.034

export const staggerDelay = (index: number) => Math.min(index, STAGGER_LIMIT) * STAGGER_STEP

/** 视图切换：容器交叉淡入淡出 —— 淡出更慢一点，避免切换时闪一下 */
export const viewContainer: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR[3], ease: EASE.out } },
  exit: { opacity: 0, transition: { duration: DUR[2], ease: EASE.inOut } },
}

/**
 * 列表项进场：错峰淡入上移。
 * 位移由 8px 收到 6px —— 位移越大越显廉价，小幅度 + 长时长才是「优雅」。
 * 只动 opacity / y —— 外层包裹元素承担动画，内层留给 dnd-kit 的 transform，两者不打架。
 */
export const itemEnter: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: DUR[4], ease: EASE.out, delay: staggerDelay(i) },
  }),
}

/** hover 上浮：2px → 1.5px，配合 CSS 的 --dur-2 使用 */
export const HOVER_LIFT = 'hover:-translate-y-[1.5px]'
