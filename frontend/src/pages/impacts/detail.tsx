import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { ImpactPayloadResponse, ImpactStepPayloadResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft, Play, Flag } from 'lucide-react';

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
  const [impact, setImpact] = useState<ImpactPayloadResponse | null>(null);
  const [loading, setLoading] = useState(true);

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
        <Button variant="ghost" asChild className="hover:bg-muted -ml-4">
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-2"/> Back to Dashboard</Link>
        </Button>
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
                <motion.div key={step.id} variants={itemVariants} className="relative pl-24 group">
                    {/* Interactive Step Circle */}
                    <motion.div 
                        whileHover={{ scale: 1.1 }}
                        className="absolute left-0 top-0 w-16 h-16 rounded-full bg-background border-4 border-primary flex items-center justify-center z-10 shadow-sm transition-colors"
                    >
                         {index === sortedSteps.length - 1 ? (
                             <Flag className="w-8 h-8 text-primary fill-current" />
                         ) : (
                            <span className="text-2xl font-bold text-primary">{step.order}</span>
                         )}
                    </motion.div>

                    <Card className="clean-card overflow-hidden group-hover:-translate-y-1 transition-transform duration-300">
                        <CardContent className="p-8">
                             <h3 className="text-2xl font-bold mb-3 text-foreground">{step.title}</h3>
                             <p className="text-muted-foreground mb-8 leading-relaxed text-lg">{step.descreption || step.description}</p>
                             
                             <Button asChild size="lg" className="alive-button rounded-full font-semibold px-8 text-white">
                                 <Link to={`/impacts/${impactId}/${step.id}`}>
                                    <Play className="w-5 h-5 mr-2 fill-current" /> Start Session
                                 </Link>
                             </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
      </motion.div>
    </div>
  );
}
