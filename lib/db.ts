import { supabase } from '@/lib/supabase-browser';

export type TableConfig<T> = {
  table: string;
  toModel: (row: Record<string, unknown>) => T;
  toRow: (model: Partial<T>) => Record<string, unknown>;
  idField: string;
};

export function camel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export function snake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

export function transformRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key in row) {
    out[camel(key)] = row[key];
  }
  return out;
}

export function transformModel(model: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key in model) {
    if (model[key] !== undefined) {
      out[snake(key)] = model[key];
    }
  }
  return out;
}

export async function fetchAll<T>(config: TableConfig<T>, orderBy?: string): Promise<T[]> {
  let query = supabase.from(config.table).select('*');
  if (orderBy) query = query.order(orderBy);
  const { data, error } = await query;
  if (error) throw error;
  return (data as Record<string, unknown>[]).map(config.toModel);
}

export async function createRow<T>(config: TableConfig<T>, model: Partial<T>): Promise<T> {
  const row = config.toRow(model);
  const { data, error } = await supabase.from(config.table).insert(row).select('*').single();
  if (error) throw error;
  return config.toModel(data as Record<string, unknown>);
}

export async function updateRow<T>(
  config: TableConfig<T>,
  id: string,
  model: Partial<T>
): Promise<T> {
  const row = config.toRow(model);
  const { data, error } = await supabase
    .from(config.table)
    .update(row)
    .eq(config.idField, id)
    .select('*')
    .single();
  if (error) throw error;
  return config.toModel(data as Record<string, unknown>);
}

export async function deleteRow<T>(config: TableConfig<T>, id: string): Promise<void> {
  const { error } = await supabase.from(config.table).delete().eq(config.idField, id);
  if (error) throw error;
}
