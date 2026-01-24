import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { ImpactPayloadResponse, ImpactListResponse } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Plus, ArrowRight, Loader2, Sparkles, Map, MoreVertical, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

// Manually defining interface because types/index.ts might be slightly off with the dict/list thing
interface Impact extends ImpactPayloadResponse {}

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
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchImpacts = async () => {
    try {
      const listRes = await api.get<unknown, ImpactListResponse>('/impact');
      const ids = listRes.impact_ids;

      const detailsPromises = ids.map(id => 
          api.get<unknown, ImpactPayloadResponse>(`/impact/${id}`)
      );

      const details = await Promise.all(detailsPromises);
      setImpacts(details);
    } catch (error) {
      console.error("Failed to fetch impacts", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImpacts();
  }, []);

  const handleDeleteImpact = async (id: string) => {
    try {
      await api.delete(`/impact/${id}`);
      setImpacts((prev) => prev.filter((i) => i.id !== id));
      toast.success("Impact plan deleted successfully");
    } catch (error) {
      console.error("Failed to delete impact", error);
      toast.error("Failed to delete impact plan");
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
            <Button asChild size="lg" className="alive-button rounded-full font-bold w-full sm:w-auto px-12">
                <Link to="/impacts/generate">
                    <Plus className="mr-2 h-5 w-5" /> Generate Impact
                </Link>
            </Button>
        </motion.div>
      ) : (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {impacts.map((impact) => (
            <motion.div key={impact.id} variants={itemVariants}>
                <Card className="clean-card h-full flex flex-col overflow-hidden group relative">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Map className="w-6 h-6" />
                        </div>
                    </div>
                    <CardTitle className="line-clamp-1 text-xl font-bold text-foreground group-hover:text-primary transition-colors pr-8">
                        {impact.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-muted-foreground">
                        {impact.descreption || impact.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                     <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <span className="bg-secondary px-2 py-1 rounded-md text-secondary-foreground">
                            {Object.keys(impact.steps).length} Steps
                        </span>
                     </div>
                  </CardContent>
                  <CardFooter className="gap-2">
                    <Button asChild variant="outline" className="flex-1 rounded-xl border-border bg-card hover:bg-secondary/50 hover:text-foreground transition-all">
                      <Link to={`/impacts/${impact.id}`}>
                        View Details <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="rounded-xl border-border bg-card hover:bg-secondary/50 transition-all">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-white border border-border shadow-xl p-1">
                        <DropdownMenuItem 
                          className="flex items-center gap-2 px-3 py-2.5 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive rounded-md transition-colors"
                          onClick={() => setDeleteId(impact.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="font-semibold">Delete Impact</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardFooter>
                </Card>
            </motion.div>
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
