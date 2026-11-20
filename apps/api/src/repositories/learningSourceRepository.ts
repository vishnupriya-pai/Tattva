import type { SupabaseClient } from '@supabase/supabase-js';
import type { LearningSourceSummary } from '@tattva/contracts';

interface LearningSourceRow {
  id: string;
  title: string;
  description: string;
  content: string;
  source_type: 'video' | 'document' | 'transcript';
  source_reference: string;
  duration_minutes: number;
}

function mapRow(row: LearningSourceRow): LearningSourceSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    content: row.content,
    sourceType: row.source_type,
    sourceReference: row.source_reference,
    durationMinutes: row.duration_minutes,
  };
}

/**
 * Read-only access to `learning_sources` (docs/DATABASE.md §3.1). The
 * hackathon MVP never inserts/updates this table from `apps/api` — curated
 * rows are seeded only (docs/DATABASE.md §12).
 */
export async function findLearningSourceById(
  client: SupabaseClient,
  id: string,
): Promise<LearningSourceSummary | null> {
  const { data, error } = await client
    .from('learning_sources')
    .select('id, title, description, content, source_type, source_reference, duration_minutes')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load learning source ${id}: ${error.message}`);
  }

  return data ? mapRow(data) : null;
}

export async function createLearningSourceRecord(
  adminClient: SupabaseClient,
  input: {
    title: string;
    description: string;
    content: string;
    sourceType: 'video' | 'document' | 'transcript';
    sourceReference: string;
    durationMinutes: number;
  },
): Promise<LearningSourceSummary> {
  const { data, error } = await adminClient
    .from('learning_sources')
    .insert({
      title: input.title,
      description: input.description,
      content: input.content,
      source_type: input.sourceType,
      source_reference: input.sourceReference,
      duration_minutes: input.durationMinutes,
    })
    .select('id, title, description, content, source_type, source_reference, duration_minutes')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create learning source: ${error?.message ?? 'unknown'}`);
  }

  return mapRow(data as unknown as LearningSourceRow);
}
