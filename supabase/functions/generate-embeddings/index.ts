/**
 * generate-embeddings — Supabase Edge Function
 *
 * Triggered by a DB webhook or called manually to generate vector embeddings
 * for a given artifact. Chunks the artifact description + title, calls the
 * Gemini embedding API, and upserts into artifact_chunks.
 *
 * POST /functions/v1/generate-embeddings
 * Body: { artifact_id }
 * Auth: service_role key required (admin-only operation)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const CHUNK_SIZE     = 400; // characters per chunk
const CHUNK_OVERLAP  = 80;  // overlap between chunks

/** Split text into overlapping chunks */
function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + size));
    start += size - overlap;
  }
  return chunks.filter(c => c.trim().length > 20);
}

/** Call Gemini embedding API */
async function getEmbedding(text: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/embedding-001',
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini embedding API error: ${res.status}`);
  const data = await res.json();
  return data.embedding?.values || [];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const traceId = req.headers.get('x-trace-id') || crypto.randomUUID();
  const log = (event: string, data?: unknown) =>
    console.log(JSON.stringify({ traceId, event, ts: Date.now(), ...(data ? { data } : {}) }));

  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { artifact_id } = await req.json();
    if (!artifact_id) {
      return new Response(JSON.stringify({ error: 'artifact_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    log('embedding_start', { artifact_id });

    // Fetch artifact
    const { data: artifact, error: artErr } = await serviceClient
      .from('artifacts')
      .select('id, title, subject, description')
      .eq('id', artifact_id)
      .single();

    if (artErr || !artifact) {
      return new Response(JSON.stringify({ error: 'Artifact not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build content string
    const fullText = [
      `Title: ${artifact.title}`,
      `Subject: ${artifact.subject}`,
      artifact.description ? `Description: ${artifact.description}` : '',
    ].filter(Boolean).join('\n');

    const chunks = chunkText(fullText);
    log('embedding_chunks', { artifact_id, count: chunks.length });

    // Delete existing chunks for this artifact
    await serviceClient.from('artifact_chunks').delete().eq('artifact_id', artifact_id);

    // Generate embeddings and insert
    const rows = [];
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await getEmbedding(chunks[i]);
      rows.push({
        artifact_id,
        chunk_index: i,
        chunk_text:  chunks[i],
        embedding:   JSON.stringify(embedding), // pgvector accepts JSON array
        token_count: Math.ceil(chunks[i].length / 4),
      });
    }

    const { error: insertErr } = await serviceClient
      .from('artifact_chunks')
      .insert(rows);

    if (insertErr) throw insertErr;

    log('embedding_complete', { artifact_id, chunks: rows.length });
    return new Response(JSON.stringify({ artifact_id, chunks_created: rows.length }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error(JSON.stringify({ traceId, event: 'embedding_error', error: (err as Error).message }));
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
