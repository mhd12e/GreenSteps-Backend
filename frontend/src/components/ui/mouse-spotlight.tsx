import { useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export function MouseSpotlight() {
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const springConfig = { damping: 25, stiffness: 300 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      style={{
        x,
        y,
        translateX: '-50%',
        translateY: '-50%',
      }}
      className="fixed top-0 left-0 w-[400px] h-[400px] pointer-events-none z-50 bg-gradient-to-r from-primary/10 to-transparent rounded-full blur-[80px] mix-blend-screen"
    />
  );
}
