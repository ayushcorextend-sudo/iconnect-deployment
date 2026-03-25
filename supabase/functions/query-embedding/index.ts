/**
 * query-embedding — Supabase Edge Function
 *
 * Converts a user search query to an embedding vector and runs semantic_search RPC.
 *
 * POST /functions/v1/query-embedding
 * Body: { query, match_count?, similarity_threshold? }
 * Auth: Bearer JWT required
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';

async function getQueryEmbedding(text: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/embedding-001',
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_QUERY',
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

  try {
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    const { query, match_count = 8, similarity_threshold = 0.65 } = await req.json();
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'query must be at least 2 characters' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(JSON.stringify({ traceId, event: 'semantic_search', query: query.slice(0, 80) }));

    const embedding = await getQueryEmbedding(query.trim());

    const { data: results, error } = await supabase.rpc('semantic_search', {
      query_embedding: JSON.stringify(embedding),
      match_count,
      similarity_threshold,
    });

    if (error) throw error;

    return new Response(JSON.stringify({ results: results || [] }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error(JSON.stringify({ traceId, event: 'query_embedding_error', error: (err as Error).message }));
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
