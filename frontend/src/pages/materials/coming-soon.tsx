import { motion } from 'framer-motion';
import { Bot, Sparkles, Construction } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function MaterialAI() {
  return (
    <div className="flex items-center justify-center h-full min-h-[60vh] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="clean-card bg-card/50 overflow-hidden relative border-dashed border-2">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
          
          <CardContent className="flex flex-col items-center text-center p-12 space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse" />
              <div className="relative bg-white p-6 rounded-3xl shadow-xl border border-primary/10 transform -rotate-3 transition-transform hover:rotate-0 duration-500">
                <Bot className="w-16 h-16 text-primary" />
              </div>
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 p-2 rounded-full shadow-lg"
              >
                <Sparkles className="w-5 h-5 fill-current" />
              </motion.div>
            </div>

            <div className="space-y-2 max-w-md">
              <h1 className="text-4xl font-extrabold text-foreground tracking-tight">
                Material AI
              </h1>
              <div className="flex items-center justify-center gap-2 text-primary font-bold text-lg bg-primary/10 py-1 px-4 rounded-full w-fit mx-auto">
                <Construction className="w-4 h-4" />
                <span>Under Construction</span>
              </div>
              <p className="text-muted-foreground text-lg leading-relaxed pt-2">
                We are building something extraordinary! Soon you'll be able to analyze materials for sustainability and eco-impact using our advanced AI.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 w-full pt-8 opacity-50">
                <div className="h-2 rounded-full bg-primary/20" />
                <div className="h-2 rounded-full bg-primary/20" />
                <div className="h-2 rounded-full bg-primary/20" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
