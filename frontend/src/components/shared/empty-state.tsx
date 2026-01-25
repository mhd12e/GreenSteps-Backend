import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon: LucideIcon;
  action?: ReactNode;
}

export function EmptyState({ title, description, icon: Icon, action }: EmptyStateProps) {
  return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-20 bg-muted/30 rounded-3xl border border-dashed border-border"
    >
        <div className="mx-auto bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-6">
            <Icon className="w-10 h-10 text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-foreground">{title}</h3>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            {description}
        </p>
        {action}
    </motion.div>
  );
}