import { Link } from 'react-router-dom';
import { Plus, Recycle } from 'lucide-react';
import { useMaterials } from '@/hooks/use-materials';
import { MaterialCard } from '@/components/materials/material-card';
import { Button } from '@/components/ui/button';
import { useTitle } from '@/hooks/use-title';
import { PageHeader } from '@/components/layout/page-header';
import { AnimatedGrid, itemVariants } from '@/components/layout/animated-grid';
import { SkeletonGrid } from '@/components/layout/skeleton-grid';
import { EmptyState } from '@/components/shared/empty-state';

export default function MaterialsListPage() {
  useTitle('Material AI');
  const { materials, loading, deleteMaterial, updateMaterialTitle } = useMaterials();

  const headerAction = (
    <Button asChild size="lg" className="alive-button rounded-full px-6 font-bold shadow-lg shadow-primary/20">
        <Link to="/materials/new">
            <Plus className="w-5 h-5 mr-2" /> New Material
        </Link>
    </Button>
  );

  const emptyAction = (
    <Button asChild size="lg" className="alive-button rounded-full font-bold px-12">
        <Link to="/materials/new">Create First Material</Link>
    </Button>
  );

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <PageHeader 
        title="Material AI"
        description="Upload photos of waste materials and let AI generate creative recycling plans."
        icon={Recycle}
        action={headerAction}
      />

      {loading ? (
        <SkeletonGrid count={3} height="h-80" />
      ) : materials.length === 0 ? (
        <EmptyState 
          title="No materials yet"
          description="Start your sustainability journey by uploading your first item to recycle."
          icon={Recycle}
          action={emptyAction}
        />
      ) : (
        <AnimatedGrid>
            {materials.map((material) => (
                <MaterialCard 
                    key={material.id} 
                    material={material} 
                    onDelete={deleteMaterial} 
                    onUpdateTitle={updateMaterialTitle}
                    variants={itemVariants}
                />
            ))}
        </AnimatedGrid>
      )}
    </div>
  );
}