import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Lightbulb, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const TIPS = [
    "Did you know? Recycling one aluminum can saves enough energy to run a TV for three hours.",
    "Upcycling reduces the need for new raw materials, saving energy and resources.",
    "Plastic bottles can be turned into durable plant pots or bird feeders!",
    "Glass is 100% recyclable and can be recycled endlessly without loss in quality.",
    "Composting organic waste reduces landfill methane emissions significantly.",
    "Old denim jeans makes excellent insulation material for homes.",
];

export function GenerationLoader() {
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-2xl mx-auto space-y-8">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
        <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Analyzing Material...</h2>
        <p className="text-muted-foreground text-lg">
            Our AI is inspecting your image to identify the material and generate the best upcycling projects.
        </p>
      </div>

      <div className="flex items-center gap-2 text-amber-900 bg-[wheat] px-4 py-2 rounded-full border border-[#d2b48c] shadow-sm">
        <AlertCircle className="w-4 h-4 text-amber-700" />
        <span className="text-sm font-medium">Please do not close this page</span>
      </div>

      <Card className="clean-card w-full max-w-lg border-primary/20 bg-primary/5 mt-8 overflow-hidden relative">
        <CardContent className="p-8 min-h-[160px] flex flex-col items-center justify-center">
            <Lightbulb className="w-8 h-8 text-primary mb-4" />
            <AnimatePresence mode="wait">
                <motion.p
                    key={currentTip}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5 }}
                    className="text-lg font-medium text-center text-foreground/80 italic"
                >
                    "{TIPS[currentTip]}"
                </motion.p>
            </AnimatePresence>
        </CardContent>
        {/* Progress bar simulation */}
        <motion.div 
            className="absolute bottom-0 left-0 h-1 bg-primary/50"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />
      </Card>
    </div>
  );
}
