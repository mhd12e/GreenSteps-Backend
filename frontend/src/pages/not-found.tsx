import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Home, Leaf, SearchX } from 'lucide-react';
import { useTitle } from '@/hooks/use-title';

export default function NotFoundPage() {
  useTitle('404 Not Found');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-background text-foreground">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/30 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-teal-500/30 rounded-full blur-[100px] animate-pulse delay-1000" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="z-10 text-center space-y-8 max-w-md"
      >
        <div className="flex flex-col items-center justify-center">
            <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="mb-4"
            >
                <SearchX className="w-24 h-24 text-primary" strokeWidth={1.5} />
            </motion.div>
            <div className="text-9xl font-black text-primary/20 select-none">
                404
            </div>
        </div>

        <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Lost in the Wilderness?</h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
                We've searched every leaf and branch, but we couldn't find the page you're looking for. Maybe it was recycled?
            </p>
        </div>

        <div className="flex justify-center pt-4">
            <Button asChild size="lg" className="alive-button rounded-full px-8 font-semibold">
                <Link to="/">
                    <Home className="mr-2 w-5 h-5" /> Return to Base
                </Link>
            </Button>
        </div>
      </motion.div>

      <div className="absolute bottom-8 text-sm text-muted-foreground flex items-center gap-2">
        <Leaf className="w-4 h-4 text-green-500" />
        <span>Don't worry, getting lost burns calories (probably).</span>
      </div>
    </div>
  );
}
