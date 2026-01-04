import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  bottomPadding?: boolean
}

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

export function PageContainer({ 
  children, 
  className,
  bottomPadding = true 
}: PageContainerProps) {
  return (
    <motion.main
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'max-w-2xl mx-auto px-4 py-6',
        bottomPadding && 'pb-32', // Space for input dock
        className
      )}
    >
      {children}
    </motion.main>
  )
}

