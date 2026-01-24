import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { ImpactListResponse, ImpactPayloadResponse } from '@/types';

// Manually defining interface because types/index.ts might be slightly off with the dict/list thing
export interface Impact extends ImpactPayloadResponse {}

export function useImpacts() {
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchImpacts = async () => {
    setLoading(true);
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

  const removeImpact = (id: string) => {
    setImpacts((prev) => prev.filter((i) => i.id !== id));
  };

  return { impacts, loading, fetchImpacts, removeImpact };
}
