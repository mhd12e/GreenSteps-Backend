import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import { useMaterialDetail } from '@/hooks/use-materials';
import { WayCard } from '@/components/materials/way-card';
import { GenerationLoader } from '@/components/materials/generation-loader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTitle } from '@/hooks/use-title';
import ReactMarkdown from 'react-markdown';

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

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { material, loading, status } = useMaterialDetail(id);
  useTitle(material?.title || 'Material Detail');

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
    );
  }

  if (!material) return <div>Not found</div>;

  const isProcessing = status === 'queued' || status === 'processing';
  const isFailed = status === 'failed';

  if (isProcessing) {
      return (
          <div className="container mx-auto px-4 py-8 max-w-6xl">
              <Button variant="ghost" asChild className="mb-6 hover:bg-muted -ml-4">
                <Link to="/materials"><ArrowLeft className="w-4 h-4 mr-2"/> Back to Materials</Link>
              </Button>
              <GenerationLoader />
          </div>
      );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Button variant="ghost" asChild className="mb-6 hover:bg-muted -ml-4">
        <Link to="/materials"><ArrowLeft className="w-4 h-4 mr-2"/> Back to Materials</Link>
      </Button>

      {/* Header Section */}      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="md:col-span-1">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="aspect-square rounded-2xl overflow-hidden border border-border shadow-md relative bg-muted"
            >
                {material.image_uri ? (
                    <img src={material.image_uri} alt={material.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/30">
                        {isProcessing && <Loader2 className="w-10 h-10 animate-spin text-primary/50" />}
                    </div>
                )}
            </motion.div>
        </div>
        
        <div className="md:col-span-2 space-y-6">
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-bold tracking-tight text-foreground">{material.title}</h1>
                    {isProcessing && <Badge variant="secondary" className="animate-pulse">Analyzing...</Badge>}
                    {isFailed && <Badge variant="destructive">Generation Failed</Badge>}
                    {status === 'ready' && <Badge className="bg-green-600 hover:bg-green-700">Analysis Complete</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                    Uploaded on {new Date(material.created_at).toLocaleDateString()}
                </p>
            </div>

            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                {material.description ? (
                    <div className="prose prose-green max-w-none text-muted-foreground leading-relaxed">
                        <ReactMarkdown>
                            {material.description}
                        </ReactMarkdown>
                    </div>
                ) : (
                    isProcessing ? (
                        <div className="flex items-center gap-2 text-primary">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>AI is currently analyzing your image to verify material composition and condition...</span>
                        </div>
                    ) : (
                        <span className="text-destructive flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            {material.error_message || "Description generation failed."}
                        </span>
                    )
                )}
            </div>
        </div>
      </div>

      {/* Ways Grid */}
      {status === 'ready' && (
        <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold">Recycling Blueprints</h2>
                <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                    {material.ways.length} Generated
                </Badge>
            </div>
            
            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
                {material.ways.map((way, index) => (
                    <WayCard 
                        key={way.id} 
                        materialId={material.id} 
                        way={way} 
                        index={index} 
                        variants={itemVariants}
                    />
                ))}
            </motion.div>
        </div>
      )}

      {isProcessing && (
        <div className="py-20 text-center space-y-4 border-2 border-dashed border-primary/20 rounded-3xl bg-primary/5 animate-pulse">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <h3 className="text-xl font-bold text-foreground">Generating Creative Solutions</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
                Our AI is brainstorming the best ways to upcycle this material. This might take a minute...
            </p>
        </div>
      )}
    </div>
  );
}
