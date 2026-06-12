import { motion } from 'framer-motion'

export default function Card({ 
  children, 
  className = '', 
  hover = true,
  ...props 
}) {
  return (
    <motion.div
      className={`
        rounded-xl p-6 md:p-8
        bg-white dark:bg-rotary-navy-light
        border border-gray-100 dark:border-white/5
        ${hover ? 'hover:shadow-lg hover:border-gray-200 dark:hover:border-white/10' : ''}
        transition-all duration-300
        ${className}
      `}
      whileHover={hover ? { y: -3 } : {}}
      {...props}
    >
      {children}
    </motion.div>
  )
}