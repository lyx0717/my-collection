import { useEffect } from 'react'
import { useMotionValue, useSpring, useTransform, m } from 'motion/react'
import { DUR } from '../lib/motion'

interface CountUpProps {
  value: number
  className?: string
}

/** 数字滚动：筛选 / 增删书签后数量平滑过渡，而非硬跳 */
export default function CountUp({ value, className }: CountUpProps) {
  const mv = useMotionValue(value)
  const spring = useSpring(mv, { duration: DUR[4] * 1000, bounce: 0 })
  const text = useTransform(spring, (v) => Math.round(v).toString())

  useEffect(() => {
    mv.set(value)
  }, [mv, value])

  return <m.span className={className}>{text}</m.span>
}
