import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

export default function AnimatedCounter({ value, suffix = '', duration = 2 }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return

    let start = 0
    const end = parseInt(value)
    const incrementTime = (duration * 1000) / end
    
    const timer = setInterval(() => {
      start += Math.ceil(end / 50)
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(start)
      }
    }, incrementTime)

    return () => clearInterval(timer)
  }, [isInView, value, duration])

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className="tabular-nums"
    >
      {count.toLocaleString()}{suffix}
    </motion.span>
  )
}
