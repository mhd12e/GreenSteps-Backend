import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { ImpactPayloadResponse, ImpactStepPayloadResponse } from '@/types';
import { Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { StepItem } from '@/components/impacts/step-item';
import { useTitle } from '@/hooks/use-title';

import { BackButton } from '@/components/ui/back-button';

// Helper to sort steps
const getSortedSteps = (stepsDict: Record<string, ImpactStepPayloadResponse>) => {
    return Object.entries(stepsDict)
        .sort(([orderA], [orderB]) => Number(orderA) - Number(orderB))
        .map(([order, step]) => ({ ...step, order: Number(order) }));
};

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
};

export default function ImpactDetailPage() {
  const { impactId } = useParams<{ impactId: string }>();
  const location = useLocation();
  const [impact, setImpact] = useState<ImpactPayloadResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useTitle(impact?.title || 'Impact Details');

  // Confetti Effect
  useEffect(() => {
    if (location.state?.newImpact) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchImpact = async () => {
      try {
        const data = await api.get<unknown, ImpactPayloadResponse>(`/impact/${impactId}`);
        setImpact(data);
      } catch (error) {
        console.error("Failed to fetch impact details", error);
      } finally {
        setLoading(false);
      }
    };

    if (impactId) fetchImpact();
  }, [impactId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!impact) {
    return <div className="text-center p-10">Impact not found</div>;
  }

  const sortedSteps = getSortedSteps(impact.steps);

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-32 pt-8">
      <div className="space-y-4">
        <BackButton to="/impacts" label="Back to Impacts" />
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl font-extrabold text-foreground tracking-tight">
                {impact.title}
            </h1>
            <p className="text-xl text-muted-foreground mt-4 leading-relaxed max-w-2xl">
                {impact.descreption || impact.description}
            </p>
        </motion.div>
      </div>

      <motion.div 
        className="relative pt-8 pb-8"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Connection Line */}
        <div className="absolute left-8 top-12 bottom-12 w-0.5 bg-border" />

        <div className="space-y-12">
            {sortedSteps.map((step, index) => (
                <StepItem 
                    key={step.id}
                    step={step}
                    isLast={index === sortedSteps.length - 1}
                    impactId={impactId!}
                    variants={itemVariants}
                />
            ))}
        </div>
      </motion.div>
    </div>
  );
}
