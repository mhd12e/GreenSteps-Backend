import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Recycle } from 'lucide-react';
import { useMaterials } from '@/hooks/use-materials';
import { MaterialCard } from '@/components/materials/material-card';
import { Button } from '@/components/ui/button';
import { useTitle } from '@/hooks/use-title';

export default function MaterialsListPage() {
  useTitle('Material AI');
  const { materials, loading, deleteMaterial, updateMaterialTitle } = useMaterials();

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                <Recycle className="w-8 h-8 text-primary" />
                Material AI
            </h1>
            <p className="text-muted-foreground mt-1">
                Upload photos of waste materials and let AI generate creative recycling plans.
            </p>
        </div>
        <Button asChild size="lg" className="alive-button rounded-full px-6 font-bold shadow-lg shadow-primary/20">
            <Link to="/materials/new">
                <Plus className="w-5 h-5 mr-2" /> New Material
            </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-80 bg-muted/20 animate-pulse rounded-2xl border border-border/50" />
            ))}
        </div>
      ) : materials.length === 0 ? (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 bg-muted/30 rounded-3xl border border-dashed border-border"
        >
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Recycle className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No materials yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
                Start your sustainability journey by uploading your first item to recycle.
            </p>
            <Button asChild size="lg" className="alive-button rounded-full font-bold px-12">
                <Link to="/materials/new">Create First Material</Link>
            </Button>
        </motion.div>
      ) : (
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
            {materials.map((material) => (
                <MaterialCard 
                    key={material.id} 
                    material={material} 
                    onDelete={deleteMaterial} 
                    onUpdateTitle={updateMaterialTitle}
                    variants={itemVariants}
                />
            ))}
        </motion.div>
      )}
    </div>
  );
}
