/**
 * supabase/notes.js — DB access layer for the Notes domain.
 *
 * All queries use the shared supabase client from lib/supabase.js.
 * Components NEVER call supabase.from() directly — they use these helpers.
 */

import { supabase } from '../supabase';

// ── User notes ─────────────────────────────────────────────────────────────

/**
 * Fetch all user_notes for a user, joined with artifact metadata needed for
 * the Subject → Book → Note hierarchy.
 *
 * Returns [] on error.
 */
export async function getUserNotesHierarchy(userId) {
  try {
    const { data, error } = await supabase
      .from('user_notes')
      .select('*, artifacts(id, title, subject)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[notes] getUserNotesHierarchy:', err.message);
    return [];
  }
}

/**
 * Fetch a single user_note by ID.
 * Returns null on error or not found.
 */
export async function getUserNoteById(noteId) {
  try {
    const { data, error } = await supabase
      .from('user_notes')
      .select('*, artifacts(id, title, subject)')
      .eq('id', noteId)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[notes] getUserNoteById:', err.message);
    return null;
  }
}

/**
 * Insert a new user note.
 * Returns the created row or null on error.
 */
export async function createNote(userId, artifactId, content) {
  try {
    const { data, error } = await supabase
      .from('user_notes')
      .insert([{ user_id: userId, artifact_id: artifactId, note_content: content }])
      .select('*, artifacts(id, title, subject)')
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.warn('[notes] createNote:', err.message);
    return null;
  }
}

/**
 * Update the content of an existing user note.
 * Returns true on success, false on error.
 */
export async function updateNote(noteId, content) {
  try {
    const { error } = await supabase
      .from('user_notes')
      .update({ note_content: content, updated_at: new Date().toISOString() })
      .eq('id', noteId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[notes] updateNote:', err.message);
    return false;
  }
}

/**
 * Delete a user note by ID.
 * Returns true on success, false on error.
 */
export async function deleteNote(noteId) {
  try {
    const { error } = await supabase
      .from('user_notes')
      .delete()
      .eq('id', noteId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[notes] deleteNote:', err.message);
    return false;
  }
}

// ── Smart (AI) notes ───────────────────────────────────────────────────────

/**
 * Fetch all smart_notes for a user, joined with artifact metadata.
 * Returns [] on error.
 */
export async function getSmartNotesHierarchy(userId) {
  try {
    const { data, error } = await supabase
      .from('smart_notes')
      .select('*, artifacts(id, title, subject)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('[notes] getSmartNotesHierarchy:', err.message);
    return [];
  }
}

/**
 * Toggle the starred state of a smart note.
 * Returns true on success, false on error.
 */
export async function toggleSmartNoteStar(noteId, isStarred) {
  try {
    const { error } = await supabase
      .from('smart_notes')
      .update({ is_starred: isStarred })
      .eq('id', noteId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[notes] toggleSmartNoteStar:', err.message);
    return false;
  }
}

/**
 * Delete a smart note by ID.
 * Returns true on success, false on error.
 */
export async function deleteSmartNote(noteId) {
  try {
    const { error } = await supabase
      .from('smart_notes')
      .delete()
      .eq('id', noteId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('[notes] deleteSmartNote:', err.message);
    return false;
  }
}

// ── Hierarchy helpers ──────────────────────────────────────────────────────

/**
 * Build a Subject → Book → [notes] tree from a flat notes array.
 *
 * Input: rows with { id, note_content, artifacts: { id, title, subject }, ... }
 * Output: [{ subject, books: [{ artifactId, title, notes: [...] }] }]
 *   - Notes without a linked artifact are grouped under subject 'Uncategorised'.
 *   - Subjects and books are sorted alphabetically.
 */
export function buildHierarchy(notes) {
  const subjectMap = {};

  for (const note of notes) {
    const subject = note.artifacts?.subject || 'Uncategorised';
    const artifactId = note.artifacts?.id || '__none__';
    const artifactTitle = note.artifacts?.title || 'Unknown Book';

    if (!subjectMap[subject]) subjectMap[subject] = {};
    if (!subjectMap[subject][artifactId]) {
      subjectMap[subject][artifactId] = { artifactId, title: artifactTitle, notes: [] };
    }
    subjectMap[subject][artifactId].notes.push(note);
  }

  return Object.entries(subjectMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([subject, books]) => ({
      subject,
      books: Object.values(books).sort((a, b) => a.title.localeCompare(b.title)),
      totalNotes: Object.values(books).reduce((n, b) => n + b.notes.length, 0),
    }));
}
