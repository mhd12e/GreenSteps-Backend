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
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
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
    <div className="max-w-3xl mx-auto space-y-8 pb-20">
      <div className="space-y-4">
        <Button variant="ghost" asChild className="-ml-4 text-muted-foreground hover:text-foreground">
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-2"/> Back to Dashboard</Link>
        </Button>
        <div>
            <h1 className="text-4xl font-extrabold text-foreground tracking-tight">{impact.title}</h1>
            <p className="text-lg text-muted-foreground mt-2">{impact.descreption || impact.description}</p>
        </div>
      </div>

      <motion.div 
        className="relative pt-8 pb-8"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Connection Line */}
        <div className="absolute left-8 top-10 bottom-10 w-1 bg-border border-l border-dashed border-primary/30" />

        <div className="space-y-12">
            {sortedSteps.map((step, index) => (
                <motion.div key={step.id} variants={itemVariants} className="relative pl-24 group">
                    {/* Step Circle */}
                    <div className="absolute left-0 top-0 w-16 h-16 rounded-full bg-background border-4 border-primary flex items-center justify-center z-10 shadow-sm transition-transform group-hover:scale-110">
                         {index === sortedSteps.length - 1 ? (
                             <Flag className="w-8 h-8 text-primary fill-primary/20" />
                         ) : (
                            <span className="text-2xl font-bold text-primary">{step.order}</span>
                         )}
                    </div>

                    <Card className="hover:shadow-md transition-shadow border-2 border-transparent hover:border-primary/10 overflow-hidden">
                        <CardContent className="p-6">
                             <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                             <p className="text-muted-foreground mb-6 leading-relaxed">{step.descreption || step.description}</p>
                             
                             <Button asChild size="lg" className="w-full sm:w-auto rounded-full font-bold shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 hover:-translate-y-0.5">
                                 <Link to={`/impacts/${impactId}/${step.id}`}>
                                    <Play className="w-4 h-4 mr-2 fill-current" /> Start Session
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
