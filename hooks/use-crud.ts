'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TableConfig } from '@/lib/db';
import { fetchAll, createRow, updateRow, deleteRow } from '@/lib/db';

interface UseCrudResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  create: (model: Partial<T>) => Promise<T | null>;
  update: (id: string, model: Partial<T>) => Promise<T | null>;
  remove: (id: string) => Promise<boolean>;
  refresh: () => void;
}

export function useCrud<T>(config: TableConfig<T>, orderBy?: string): UseCrudResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchAll(config, orderBy)
      .then((rows) => {
        if (mounted) {
          setData(rows);
          setError(null);
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Failed to load data');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [config, orderBy, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const create = useCallback(
    async (model: Partial<T>): Promise<T | null> => {
      try {
        const created = await createRow(config, model);
        setData((prev) => [created, ...prev]);
        setError(null);
        return created;
      } catch (err) {
        setError((err as Error).message || 'Failed to create');
        return null;
      }
    },
    [config]
  );

  const update = useCallback(
    async (id: string, model: Partial<T>): Promise<T | null> => {
      try {
        const updated = await updateRow(config, id, model);
        setData((prev) => prev.map((item) => ((item as Record<string, unknown>).id === id ? updated : item)));
        setError(null);
        return updated;
      } catch (err) {
        setError((err as Error).message || 'Failed to update');
        return null;
      }
    },
    [config]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await deleteRow(config, id);
        setData((prev) => prev.filter((item) => (item as Record<string, unknown>).id !== id));
        setError(null);
        return true;
      } catch (err) {
        setError((err as Error).message || 'Failed to delete');
        return false;
      }
    },
    [config]
  );

  return { data, loading, error, create, update, remove, refresh };
}
