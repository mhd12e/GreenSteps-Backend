import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export function EmptyImpactState() {
  return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-20 bg-muted/30 rounded-3xl border border-dashed border-border"
    >
        <div className="mx-auto bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-foreground">No impacts yet</h3>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Ready to make a difference? Generate your first personalized impact plan and start your journey.
        </p>
        <Button asChild size="lg" className="alive-button rounded-full font-bold w-[90%] sm:w-auto px-12 mx-auto">
            <Link to="/impacts/generate">
                <Sparkles className="mr-2 h-5 w-5" /> Generate Impact
            </Link>
        </Button>
    </motion.div>
  );
}
