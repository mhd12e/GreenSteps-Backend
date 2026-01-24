import { motion } from 'framer-motion';
import logo from '@/assets/logo.png';

interface VisualizerProps {
  volume: number; // 0 to 1 normalized
  isActive: boolean;
}

export function Visualizer({ volume, isActive }: VisualizerProps) {
  // Map volume (0-1) to scale (1.0-2.5)
  const scale = 1 + volume * 1.5;

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
        {/* Ripple effect */}
        {isActive && (
            <motion.div
                animate={{
                    scale: [1, 2],
                    opacity: [0.5, 0],
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut",
                }}
                className="absolute w-32 h-32 rounded-full bg-primary/20"
            />
        )}

      <motion.div
        animate={{ scale: isActive ? scale : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative z-10"
      >
        <img 
            src={logo} 
            alt="Logo"
            className="w-32 h-32 object-contain drop-shadow-2xl" 
        />
      </motion.div>
    </div>
  );
}
