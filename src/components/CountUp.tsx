import { useEffect } from 'react'
import { useMotionValue, useSpring, useTransform, m } from 'motion/react'
import { DUR } from '../lib/motion'

interface CountUpProps {
  value: number
  className?: string
  /**
   * 预留几位数字的宽度。缺省按 value 自身的位数推算。
   * 调用方若知道数量上限（通常是该分组/筛选下的总数），
   * 应当传进来 —— 否则从 99 变 100 这类进位仍会撑宽容器。
   */
  digits?: number
}

/**
 * 数字滚动：筛选 / 增删书签后数量平滑过渡，而非硬跳。
 *
 * 宽度必须锁死，否则整条工具条会跟着抖：
 * spring 过渡期间会依次经过 142 / 138 / … / 12 / 9 等中间值，
 * 位数一变，容器宽度就变，右侧的筛选框与按钮被推着左右闪。
 *
 * 两道保险：
 * 1. tabular-nums —— 等宽数字，0 与 8 占位一致，字形切换本身不改变宽度；
 * 2. min-width 按 ch 预留 —— ch 即「0」的宽度，等宽后 N 位 = N ch，
 *    把位数变化吸收成一段永远够用的空白。
 * 数字右对齐，进位时旧值向左让位，观感是数字在框内滚动而非整框伸缩。
 */
export default function CountUp({ value, className, digits }: CountUpProps) {
  const mv = useMotionValue(value)
  const spring = useSpring(mv, { duration: DUR[4] * 1000, bounce: 0 })
  const text = useTransform(spring, (v) => Math.round(v).toString())

  const slots = Math.max(digits ?? String(value).length, String(value).length, 1)

  useEffect(() => {
    mv.set(value)
  }, [mv, value])

  return (
    <m.span
      className={`inline-block text-right tabular-nums ${className ?? ''}`}
      style={{ minWidth: `${slots}ch` }}
    >
      {text}
    </m.span>
  )
}
