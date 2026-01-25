import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Material } from '@/types';
import { toast } from 'sonner';

export function useMaterials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<unknown, Material[]>('/materials/');
      // API returns Envelope[List[Material]], api.ts unwraps Envelope -> data is List[Material]
      setMaterials(data);
    } catch (error) {
      console.error("Failed to fetch materials", error);
      toast.error("Failed to load materials");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const deleteMaterial = async (id: string) => {
    try {
        await api.delete(`/materials/${id}`);
        setMaterials((prev) => prev.filter((m) => m.id !== id));
        toast.success("Material deleted");
    } catch (error) {
        console.error("Failed to delete", error);
        toast.error("Failed to delete material");
    }
  };

  const updateMaterialTitle = async (id: string, newTitle: string) => {
    try {
        const updated = await api.patch<unknown, Material>(`/materials/${id}`, { title: newTitle });
        setMaterials((prev) => prev.map((m) => (m.id === id ? { ...m, title: updated.title } : m)));
        toast.success("Title updated");
    } catch (error) {
        console.error("Failed to update title", error);
        toast.error("Failed to update title");
    }
  };

  return { materials, loading, fetchMaterials, deleteMaterial, updateMaterialTitle };
}

export function useMaterialDetail(id: string | undefined) {
    const [material, setMaterial] = useState<Material | null>(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<string>('queued');

    const fetchDetail = useCallback(async () => {
        if (!id) return;
        try {
            const data = await api.get<unknown, Material>(`/materials/${id}`);
            setMaterial(data);
            setStatus(data.status);
        } catch (error) {
            console.error("Fetch detail failed", error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    // Polling logic if status is not ready/failed
    useEffect(() => {
        fetchDetail();
        
        let interval: NodeJS.Timeout;
        if (status === 'queued' || status === 'processing') {
            interval = setInterval(fetchDetail, 3000); // Poll every 3s
        }
        
        return () => clearInterval(interval);
    }, [fetchDetail, status]);

    return { material, loading, status };
}