import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { useImpacts } from '@/hooks/use-impacts';
import { ImpactCard } from '@/components/impacts/impact-card';
import { EmptyImpactState } from '@/components/impacts/empty-state';

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export default function Dashboard() {
  const { impacts, loading, removeImpact } = useImpacts();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDeleteImpact = async (id: string) => {
    try {
      await api.delete(`/impact/${id}`);
      removeImpact(id);
      toast.success("Impact plan deleted successfully");
    } catch (error: any) {
      console.error("Failed to delete impact", error);
      const msg = error.response?.data?.error?.message || "Failed to delete impact plan";
      toast.error(msg);
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 pt-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-center md:text-left">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
                My Impacts
            </h1>
            <p className="text-muted-foreground mt-1">Track your journey to a greener future.</p>
        </div>
        <Button asChild className="alive-button rounded-full px-6">
          <Link to="/impacts/generate">
            <Plus className="mr-2 h-5 w-5" /> Generate New Plan
          </Link>
        </Button>
      </div>

      {impacts.length === 0 ? (
        <EmptyImpactState />
      ) : (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {impacts.map((impact) => (
            <ImpactCard 
                key={impact.id} 
                impact={impact} 
                onDeleteRequest={setDeleteId} 
                variants={itemVariants} 
            />
          ))}
        </motion.div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="clean-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              impact plan and all associated progress.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteId && handleDeleteImpact(deleteId)}
              className="bg-red-600 text-white border border-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-500/20 transition-all duration-300"
            >
              Delete Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

