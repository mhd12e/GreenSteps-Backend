import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { MaterialWay } from '@/types';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useTitle } from '@/hooks/use-title';

import { BackButton } from '@/components/ui/back-button';

export default function WayDetailPage() {
  const { id, wayId } = useParams<{ id: string; wayId: string }>();
  const [way, setWay] = useState<MaterialWay | null>(null);
  const [loading, setLoading] = useState(true);

  // Since we don't have a direct /ways/{id} endpoint (nested in material), 
  // we fetch material and find the way. 
  // Optimization: Backend could have /materials/ways/{id} but fetching parent is fine.
  useEffect(() => {
    const fetchWay = async () => {
        try {
            // Assuming /materials/{id} returns ways list
            // Or better, we should have a specific endpoint or just filter client side for now
            // I'll filter client side from material detail endpoint
            const data: any = await api.get(`/materials/${id}`);
            const found = data.ways.find((w: any) => w.id === wayId);
            setWay(found);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };
    fetchWay();
  }, [id, wayId]);

  useTitle(way?.title || 'Guide');

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!way) return <div>Not found</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <BackButton to={`/materials/${id}`} label="Back to Plans" />

        {/* Project Header Card */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-3xl p-8 md:p-10 border border-border shadow-sm"
        >
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
                {way.title}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-3xl">
                {way.description}
            </p>
        </motion.div>

        {/* Main Content Card */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-3xl overflow-hidden shadow-sm border border-border"
        >
            <div className="aspect-video relative bg-muted border-b border-border">
                {way.image_uri && (
                    <img src={way.image_uri} alt={way.title} className="w-full h-full object-cover" />
                )}
            </div>

            <div className="p-8 md:p-12 bg-white">
                <article className="prose prose-lg prose-green max-w-none 
                    prose-headings:text-foreground prose-headings:font-extrabold
                    prose-p:text-muted-foreground prose-p:leading-relaxed
                    prose-strong:text-foreground prose-strong:font-bold
                    prose-li:text-muted-foreground prose-li:marker:text-primary
                    prose-hr:border-border
                    prose-img:rounded-2xl prose-img:shadow-md
                    prose-blockquote:border-l-primary prose-blockquote:text-primary/80
                    ">
                    <ReactMarkdown>{way.md}</ReactMarkdown>
                </article>
            </div>
        </motion.div>
    </div>
  );
}
