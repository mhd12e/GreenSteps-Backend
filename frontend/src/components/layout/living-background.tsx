import { memo } from 'react';
import { motion } from 'framer-motion';
import { Leaf, Sprout, Recycle, Flower, Wind, TreeDeciduous } from 'lucide-react';

const BACKGROUND_ICONS = [
  { Icon: Leaf, size: 24, top: '15%', left: '10%', delay: 0 },
  { Icon: Sprout, size: 32, top: '25%', left: '85%', delay: 2 },
  { Icon: Recycle, size: 28, top: '75%', left: '15%', delay: 4 },
  { Icon: Flower, size: 20, top: '85%', left: '70%', delay: 1 },
  { Icon: Wind, size: 40, top: '45%', left: '40%', delay: 3 },
  { Icon: TreeDeciduous, size: 36, top: '65%', left: '90%', delay: 5 },
  { Icon: Leaf, size: 20, top: '10%', left: '60%', delay: 6 },
  { Icon: Sprout, size: 24, top: '90%', left: '30%', delay: 7 },
];

export const LivingBackground = memo(function LivingBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-50 bg-background transition-colors duration-1000">
      {/* Background Blobs - Self Animating */}
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
          scale: [1, 1.05, 0.95, 1],
          opacity: [0.08, 0.12, 0.08],
        }}
        transition={{ 
          duration: 25, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-primary rounded-full blur-[120px]"
      />

      <motion.div
        animate={{
          x: [0, -40, 30, 0],
          y: [0, 20, -30, 0],
          scale: [1, 1.1, 0.9, 1],
          opacity: [0.06, 0.1, 0.06],
        }}
        transition={{ 
          duration: 30, 
          repeat: Infinity, 
          ease: "easeInOut", 
          delay: 5 
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-teal-600 rounded-full blur-[150px]"
      />

      {/* Floating Icons - Self Animating */}
      {BACKGROUND_ICONS.map(({ Icon, size, top, left, delay }, i) => (
        <motion.div
          key={i}
          initial={{ top, left }}
          animate={{
            x: [0, 10, -10, 0],
            y: [0, -20, 10, 0],
            rotate: [0, 15, -15, 0],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 10 + Math.random() * 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: delay,
          }}
          className="absolute text-primary"
        >
          <Icon size={size} strokeWidth={1.5} />
        </motion.div>
      ))}
      
      {/* Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-multiply"
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }} 
      />
    </div>
  );
});