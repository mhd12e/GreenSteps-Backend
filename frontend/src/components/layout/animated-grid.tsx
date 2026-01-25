import { motion } from 'framer-motion';
import { ReactNode } from 'react';

const defaultContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

interface AnimatedGridProps {
  children: ReactNode;
  variants?: typeof defaultContainerVariants;
  className?: string;
}

export function AnimatedGrid({ 
  children, 
  variants = defaultContainerVariants,
  className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
}: AnimatedGridProps) {
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};
