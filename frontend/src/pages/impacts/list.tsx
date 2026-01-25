import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, Map, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useImpacts } from '@/hooks/use-impacts';
import { ImpactCard } from '@/components/impacts/impact-card';
import { EmptyState } from '@/components/shared/empty-state';
import { useTitle } from '@/hooks/use-title';
import { PageHeader } from '@/components/layout/page-header';
import { AnimatedGrid, itemVariants } from '@/components/layout/animated-grid';
import { SkeletonGrid } from '@/components/layout/skeleton-grid';

export default function ImpactsList() {
  useTitle('My Impacts');
  const { impacts, loading, removeImpact } = useImpacts();

  const handleDeleteImpact = async (id: string) => {
    try {
      await api.delete(`/impact/${id}`);
      removeImpact(id);
      toast.success("Impact plan deleted successfully");
    } catch (error: any) {
      console.error("Failed to delete impact", error);
      const msg = error.response?.data?.error?.message || "Failed to delete impact plan";
      toast.error(msg);
    }
  };

  const headerAction = (
    <Button asChild size="lg" className="alive-button rounded-full px-6 font-bold shadow-lg shadow-primary/20">
      <Link to="/impacts/generate">
        <Plus className="mr-2 h-5 w-5" /> Generate New Impact
      </Link>
    </Button>
  );

  const emptyAction = (
    <Button asChild size="lg" className="alive-button rounded-full font-bold w-[90%] sm:w-auto px-12 mx-auto">
        <Link to="/impacts/generate">
            <Sparkles className="mr-2 h-5 w-5" /> Generate Impact
        </Link>
    </Button>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <PageHeader 
        title="My Impacts"
        description="Track your journey to a greener future."
        icon={Map}
        action={headerAction}
      />

      {loading ? (
        <SkeletonGrid count={3} height="h-64" />
      ) : impacts.length === 0 ? (
        <EmptyState 
          title="No impacts yet"
          description="Ready to make a difference? Generate your first personalized impact plan and start your journey."
          icon={Sparkles}
          action={emptyAction}
        />
      ) : (
        <AnimatedGrid>
          {impacts.map((impact) => (
            <ImpactCard 
                key={impact.id} 
                impact={impact} 
                onDelete={handleDeleteImpact} 
                variants={itemVariants} 
            />
          ))}
        </AnimatedGrid>
      )}
    </div>
  );
}
