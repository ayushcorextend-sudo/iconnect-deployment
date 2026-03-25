/**
 * semanticSearch.js — Client-side semantic search via query-embedding Edge Function.
 *
 * Falls back to a keyword filter on the local artifacts array if the Edge
 * Function is unavailable (no GEMINI_API_KEY configured, offline, etc.).
 */
import { supabase } from './supabase';

/**
 * Run a semantic search against artifact_chunks via the query-embedding Edge Function.
 * @param {string} query - Natural language query
 * @param {object} options
 * @param {number} [options.matchCount=8]
 * @param {number} [options.similarityThreshold=0.65]
 * @returns {Promise<Array<{ artifact_id, title, subject, similarity, chunk_text }>>}
 */
export async function semanticSearch(query, { matchCount = 8, similarityThreshold = 0.65 } = {}) {
  if (!query || query.trim().length < 2) return [];

  try {
    const { data, error } = await supabase.functions.invoke('query-embedding', {
      body: {
        query: query.trim(),
        match_count: matchCount,
        similarity_threshold: similarityThreshold,
      },
    });

    if (error) throw error;
    return data?.results || [];
  } catch (err) {
    console.warn('[semanticSearch] Edge function unavailable, falling back to keyword search:', err.message);
    return []; // caller handles empty by showing keyword results
  }
}

/**
 * Keyword fallback filter — searches title + subject + description locally.
 * Used when semantic search is unavailable.
 * @param {string} query
 * @param {Array} artifacts - local artifacts array from useAppStore
 * @returns {Array}
 */
export function keywordSearch(query, artifacts) {
  if (!query || !artifacts?.length) return [];
  const q = query.toLowerCase();
  return artifacts.filter(a =>
    a.title?.toLowerCase().includes(q) ||
    a.subject?.toLowerCase().includes(q) ||
    a.description?.toLowerCase().includes(q)
  );
}
