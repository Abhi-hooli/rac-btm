import { motion } from 'framer-motion'

export default function Button({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) {
  const baseClass = variant === 'primary' ? 'btn-primary' : 'btn-secondary'

  return (
    <motion.button
      className={`${baseClass} ${className}`}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {children}
    </motion.button>
  )
}