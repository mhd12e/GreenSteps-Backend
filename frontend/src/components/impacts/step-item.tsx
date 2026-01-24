import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Flag } from 'lucide-react';
import { motion } from 'framer-motion';
import { ImpactStepPayloadResponse } from '@/types';

interface StepItemProps {
  step: ImpactStepPayloadResponse & { order: number };
  isLast: boolean;
  impactId: string;
  variants: any;
}

export function StepItem({ step, isLast, impactId, variants }: StepItemProps) {
  return (
    <motion.div variants={variants} className="relative pl-24 group">
        {/* Interactive Step Circle */}
        <motion.div 
            whileHover={{ scale: 1.1 }}
            className="absolute left-0 top-0 w-16 h-16 rounded-full bg-background border-4 border-primary flex items-center justify-center z-10 shadow-sm transition-colors"
        >
             {isLast ? (
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
  );
}
