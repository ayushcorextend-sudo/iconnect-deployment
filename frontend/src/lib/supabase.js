import { createClient } from '@supabase/supabase-js'
import { toSnake } from './dbService'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6eHN5ZXpucHVkb21lcXhibnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMjQ1NjEsImV4cCI6MjA4NzkwMDU2MX0.4w2UkRl3rxq2WOiQDmY4aMPGUhQ_5V4W8hridmGmy9o'
)

// Race a promise against a timeout
const withTimeout = (promise, ms = 7000) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    )
  ])

/**
 * withRetryAndTimeout(promiseFn, maxRetries, timeoutMs)
 *
 * Higher-order resilience wrapper.
 * - Races the factory function's promise against a hard timeout.
 * - On network errors (TypeError / fetch failure), timeouts, or 5xx
 *   server errors: waits 1 second then retries, up to maxRetries times.
 * - All other errors (4xx, validation, auth) are thrown immediately.
 */
export const withRetryAndTimeout = async (promiseFn, maxRetries = 2, timeoutMs = 8000) => {
  const isRetriable = (err) => {
    if (!err) return false;
    if (err.message === 'Request Timeout') return true;
    if (err.name === 'TypeError') return true; // fetch() network failure
    if (err.message?.toLowerCase().includes('network')) return true;
    if (err.message?.toLowerCase().includes('failed to fetch')) return true;
    const status = err.status ?? err.code;
    if (typeof status === 'number' && status >= 500 && status < 600) return true;
    return false;
  };

  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await Promise.race([
        promiseFn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request Timeout')), timeoutMs)
        ),
      ]);
    } catch (err) {
      lastError = err;
      if (isRetriable(err) && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// ─── AUTH ────────────────────────────────────────────────────

// Resolve MCI/NMC number to email via profiles table
const resolveIdentifier = async (identifier) => {
  if (identifier.includes('@')) return identifier
  // Looks like MCI number — look up the profile
  try {
    const { data } = await withTimeout(
      supabase.from('profiles').select('email').eq('mci_number', identifier).maybeSingle()
    )
    if (data?.email) return data.email
  } catch (e) { console.warn('supabase: MCI lookup failed:', e.message); }
  // If lookup fails, return as-is (let Supabase reject it)
  return identifier
}

export const authSignInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
  return data
}

export const authSendOtp = async (email) => {
  // SEC-005: shouldCreateUser:false — OTP is login-only. New accounts go through
  // the explicit /register flow. This prevents phantom account creation.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false }
  })
  if (error) throw error
  return { success: true }
}

export const authVerifyOtp = async (email, token) => {
  const { data, error } = await supabase.auth.verifyOtp({
    email, token, type: 'email'
  })
  if (error) throw error

  let profile = null
  try {
    const { data: p } = await supabase
      .from('profiles').select('*')
      .eq('id', data.user.id).maybeSingle()
    profile = p
  } catch (e) { console.warn('supabase: authVerifyOtp profile fetch failed:', e.message); }

  // SEC-001: Block pending/rejected doctors BEFORE granting app access.
  // signOut is called first so the session is invalidated server-side — not just UI-gated.
  const status = profile?.status
  if (status === 'pending') {
    await supabase.auth.signOut()
    throw new Error('Your account is pending verification. Please wait for admin approval.')
  }
  if (status === 'rejected') {
    await supabase.auth.signOut()
    throw new Error('Your account has been rejected. Please contact support.')
  }

  const role = profile?.role || 'doctor'
  const name = profile?.name || data.user.email

  localStorage.setItem('iconnect_session', JSON.stringify({
    userId: data.user.id, email: data.user.email,
    role, name, mode: 'online', needsProfile: !profile
  }))

  return {
    role, name, mode: 'online',
    needsProfile: !profile,
    userId: data.user.id,
    email: data.user.email
  }
}

export const createProfileForOAuthUser = async (userId, email, profileData) => {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    email: email.trim().toLowerCase(),
    name: profileData.name?.trim(),
    phone: profileData.phone?.trim(),
    mci_number: profileData.mciNumber?.trim(),
    neet_rank: profileData.neetRank ? Number(profileData.neetRank) : null,
    program: profileData.program,
    speciality: profileData.speciality,
    college: profileData.college?.trim(),
    joining_year: profileData.joining ? Number(profileData.joining) : null,
    passout_year: profileData.passout_year ? Number(profileData.passout_year) : null,
    place_of_study: profileData.place_of_study?.trim(),
    hometown: profileData.hometown?.trim(),
    state: profileData.homeState,
    district: profileData.district,
    zone: profileData.zone || null,
    role: 'doctor',
    status: 'pending',
    verified: false,
  }, { onConflict: 'id' })
  if (error) throw error
}

export const authSignIn = async (email, password) => {
  // Normalise input
  email = (email || '').trim().toLowerCase()
  // Resolve MCI number → email before attempting sign-in
  const resolvedEmail = await resolveIdentifier(email)

  try {
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email: resolvedEmail, password })
    )
    if (error) {
      if (error.status === 429) throw new Error('Too many login attempts. Please wait a moment and try again.')
      throw error
    }

    // Fetch profile — don't let this crash the whole login
    let profile = null
    try {
      const { data: p } = await withTimeout(
        supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle()
      )
      profile = p
    } catch (e) { console.warn('supabase: authSignIn profile fetch failed:', e.message); }

    const role = profile?.role || 'doctor'
    const name = profile?.name || email
    const status = profile?.status || 'pending'

    // Block doctors who have not been approved yet
    if (role === 'doctor' && status === 'pending') {
      throw new Error('Your account is pending verification. Please wait for admin approval.')
    }
    if (role === 'doctor' && status === 'rejected') {
      throw new Error('Your account has been rejected. Please contact support.')
    }

    localStorage.setItem(
      'iconnect_session',
      JSON.stringify({
        userId: data.user.id,
        email,
        role,
        name,
        mode: 'online'
      })
    )
    return { role, name, userId: data.user.id, mode: 'online' }

  } catch (err) {
    if (err.message === 'timeout' || err.message?.toLowerCase().includes('failed to fetch')) {
      throw new Error('Connection timed out. Please check your internet and try again.')
    }
    // Propagate known Supabase errors (rate limit, email not confirmed, etc.)
    if (err.status === 429) throw err
    throw new Error(err.message || 'Invalid email or password. Please try again.')
  }
}

export const authSignOut = async () => {
  // Preserve theme and onboarding state across sessions
  const keep = ['iconnect_theme', 'iconnect_onboarding', 'iconnect_onboarded']
  Object.keys(localStorage)
    .filter(k => k.startsWith('iconnect_') && !keep.includes(k))
    .forEach(k => localStorage.removeItem(k))
  try { await supabase.auth.signOut() } catch (e) { /* signOut — safe to ignore */ }
}

export const getStoredSession = () => {
  try {
    const raw = localStorage.getItem('iconnect_session')
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    console.warn('supabase: getStoredSession parse failed:', e.message);
    return null
  }
}

export const registerUser = async (email, password, profile) => {
  // ONLINE PATH
  try {
    const { data, error } = await withTimeout(
      supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: profile.name } },  // Step 2: write name to auth metadata
      })
    )
    if (error) {
      if (error.message?.toLowerCase().includes('already')) {
        throw new Error('An account with this email already exists.')
      }
      throw error
    }

    // Step 3: Profile insert is now FATAL — a failure here must surface to the caller
    // toSnake() converts any camelCase keys in `profile` spread to snake_case,
    // preventing NULL inserts for fields like firstName → first_name (BUG-E).
    const profileRow = toSnake({
      id: data.user.id, email, role: 'doctor', status: 'pending', verified: false,
      mci_number: profile.mci_number,
      name: profile.name,
      speciality: profile.speciality,
      college: profile.college,
      ...profile,
    });
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([profileRow])
    if (profileError) {
      // Step 4: Throw a labelled error so the outer catch re-throws rather than falling to offline path
      const e = new Error('Profile setup failed. Your account was created but could not be saved. Please contact support@iconnect.in')
      e.isProfileError = true
      throw e
    }

    // Step 5: Detect email-verification-required state
    return {
      success: true,
      mode: 'online',
      userId: data.user.id,
      requiresEmailVerification: !!(data.user && !data.session),
    }

  } catch (e) {
    // BUG-D: The offline localStorage path has been removed.
    // Demo mode is disabled — all registration must go through Supabase.
    // A localStorage-only account cannot be verified, approved, or used securely.
    // Surface the real error to the user so they know to retry when online.
    throw e
  }
}

// ─── ARTIFACTS ───────────────────────────────────────────────

const mapRow = a => ({
  id: a.id,
  title: a.title,
  subject: a.subject,
  type: a.type || 'PDF',
  size: a.size || '—',
  uploadedBy: a.uploaded_by || a.uploadedBy || 'Unknown',
  uploaded_by_id: a.uploaded_by_id || null,
  date: a.date,
  status: a.status,
  downloads: a.downloads || 0,
  pages: a.pages || 0,
  emoji: a.emoji || '📗',
  access: a.access || 'all',
  url: a.url || a.file_url || null,
  file_url: a.file_url || a.url || null,
  thumbnail_url: a.thumbnail_url || null,
  rejection_reason: a.rejection_reason || null,
  description: a.description || '',
})

export const fetchArtifacts = async (role = 'doctor') => {
  try {
    let query = supabase.from('artifacts').select('*').order('id', { ascending: false });
    if (role === 'doctor') query = query.eq('status', 'approved');
    const { data, error } = await withRetryAndTimeout(() => query)
    if (error) throw error
    const mapped = data.map(mapRow)
    // Cache for offline fallback
    localStorage.setItem('iconnect_artifacts', JSON.stringify(mapped))
    return mapped
  } catch (e) {
    // Return cached data if available
    console.warn('supabase: fetchArtifacts failed:', e.message);
    try {
      const cached = localStorage.getItem('iconnect_artifacts')
      return cached ? JSON.parse(cached) : []
    } catch (e2) {
      console.warn('supabase: fetchArtifacts cache parse failed:', e2.message);
      return []
    }
  }
}

export const approveArtifact = async (id) => {
  try {
    await withTimeout(
      supabase.from('artifacts').update({ status: 'approved' }).eq('id', id)
    )
  } catch (e) { console.warn('supabase: approveArtifact failed:', e.message); }
}

export const rejectArtifact = async (id, reason = '') => {
  try {
    await withTimeout(
      supabase.from('artifacts').update({
        status: 'rejected',
        rejection_reason: reason.trim() || 'No reason provided.',
      }).eq('id', id)
    )
  } catch (e) { console.warn('supabase: rejectArtifact failed:', e.message); }
}

/** Insert a new artifact row and return it */
export const insertArtifact = async (artifactData) => {
  const { data, error } = await supabase
    .from('artifacts')
    .insert([artifactData])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Upload a file to Supabase Storage and return the public URL */
export const uploadToStorage = async (bucket, filePath, file) => {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { cacheControl: '3600', upsert: true });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return urlData?.publicUrl || null;
}

/** Fetch only MY artifacts (for Content Admin "My Uploads" view) */
export const fetchMyArtifacts = async (userId) => {
  const { data, error } = await supabase
    .from('artifacts')
    .select('*')
    .eq('uploaded_by_id', userId)
    .order('id', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapRow);
}

export const updateArtifact = async (id, updateData) => {
  const { error } = await withTimeout(
    supabase.from('artifacts').update(updateData).eq('id', id)
  )
  if (error) throw error
}

export const deleteArtifact = async (id) => {
  const { error } = await withTimeout(
    supabase.from('artifacts').delete().eq('id', id)
  )
  if (error) throw error
}

// ─── USER CONTENT STATE ──────────────────────────────────────

// Returns a map keyed by String(artifact_id) → { isBookmarked, currentPage }
export const getUserContentStates = async (userId) => {
  try {
    const { data, error } = await withRetryAndTimeout(
      () => supabase
        .from('user_content_state')
        .select('artifact_id, is_bookmarked, current_page')
        .eq('user_id', userId)
    )
    if (error) throw error
    return (data || []).reduce((acc, row) => {
      acc[String(row.artifact_id)] = {
        isBookmarked: row.is_bookmarked,
        currentPage: row.current_page,
      }
      return acc
    }, {})
  } catch (e) {
    console.warn('supabase: getUserContentStates failed:', e.message);
    return {}
  }
}

export const toggleBookmark = async (userId, artifactId, isBookmarked) => {
  const { error } = await withTimeout(
    supabase.from('user_content_state').upsert(
      { user_id: userId, artifact_id: artifactId, is_bookmarked: isBookmarked, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,artifact_id' }
    )
  )
  if (error) throw error
}

export const updateReadingProgress = async (userId, artifactId, page) => {
  const { error } = await withTimeout(
    supabase.from('user_content_state').upsert(
      { user_id: userId, artifact_id: artifactId, current_page: page, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,artifact_id' }
    )
  )
  if (error) throw error
}

export const uploadArtifact = async (artifact) => {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('artifacts')
        .insert([{
          title: artifact.title,
          subject: artifact.subject,
          size: artifact.size || '—',
          uploaded_by: artifact.uploadedBy || 'Unknown',
          status: 'pending',
          emoji: artifact.emoji || '📗',
          access: artifact.access || 'all'
        }])
        .select()
        .single()
    )
    if (error) throw error
    return mapRow(data)
  } catch (e) {
    // Return a local artifact so the UI still updates
    console.warn('supabase: uploadArtifact failed:', e.message);
    return { ...artifact, id: Date.now(), status: 'pending' }
  }
}

export const getNotes = async (userId, artifactId) => {
  try {
    const { data, error } = await supabase.from('user_notes')
      .select('*').eq('user_id', userId).eq('artifact_id', artifactId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  } catch (err) { console.error('Error fetching notes:', err); return []; }
};

export const saveNote = async (userId, artifactId, content) => {
  try {
    const { data, error } = await supabase.from('user_notes')
      .insert([{ user_id: userId, artifact_id: artifactId, note_content: content }])
      .select();
    if (error) throw error;
    return data[0];
  } catch (err) { console.error('Error saving note:', err); return null; }
};

export const deleteNote = async (noteId) => {
  try {
    const { error } = await supabase.from('user_notes').delete().eq('id', noteId);
    if (error) throw error;
    return true;
  } catch (err) { console.error('Error deleting note:', err); return false; }
};

export const getAllUserNotes = async (userId) => {
  try {
    const { data, error } = await supabase.from('user_notes')
      .select('*, artifacts(title)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) { console.error('Error fetching all notes:', err); return []; }
};

export const getSmartNotes = async (userId) => {
  try {
    const { data, error } = await supabase.from('smart_notes')
      .select('*, artifacts(title)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) { console.error('Error fetching smart notes:', err); return []; }
};

export const toggleSmartNoteStar = async (noteId, isStarred) => {
  try {
    const { error } = await supabase.from('smart_notes')
      .update({ is_starred: isStarred })
      .eq('id', noteId);
    if (error) throw error;
    return true;
  } catch (err) { console.error('Error updating smart note:', err); return false; }
};

export const deleteSmartNote = async (noteId) => {
  try {
    const { error } = await supabase.from('smart_notes').delete().eq('id', noteId);
    if (error) throw error;
    return true;
  } catch (err) { console.error('Error deleting smart note:', err); return false; }
};

// ── Calendar Diary helpers ────────────────────────────────────────────────────
// Shared data contract for both DiaryPanel and DayDetailPanel.
// Columns: user_id, date, mood, personal_notes, study_hours, goals_met

export const getDiaryEntry = async (userId, date) => {
  try {
    const { data, error } = await supabase
      .from('calendar_diary')
      .select('personal_notes, study_hours, goals_met, mood')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle();
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error fetching diary entry:', err);
    return { data: null, error: err };
  }
};

export const getDiaryEntriesRange = async (userId, fromDate) => {
  try {
    const { data, error } = await supabase
      .from('calendar_diary')
      .select('date, study_hours')
      .eq('user_id', userId)
      .gte('date', fromDate)
      .order('date');
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching diary entries range:', err);
    return { data: [], error: err };
  }
};

// Returns activity_logs for a specific day — used by JournalModal to show the activity timeline.
export const getActivityLogsForDay = async (userId, date) => {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('activity_type, duration_minutes, score_delta, created_at')
      .eq('user_id', userId)
      .gte('created_at', `${date}T00:00:00`)
      .lte('created_at', `${date}T23:59:59`)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.warn('[supabase] getActivityLogsForDay:', err.message);
    return { data: [], error: err };
  }
};

// Returns user_content_state rows updated on a specific day — used by JournalModal.
export const getContentProgressForDay = async (userId, date) => {
  try {
    const { data, error } = await supabase
      .from('user_content_state')
      .select('content_type, progress_pct, updated_at')
      .eq('user_id', userId)
      .gte('updated_at', `${date}T00:00:00`)
      .lte('updated_at', `${date}T23:59:59`)
      .order('updated_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.warn('[supabase] getContentProgressForDay:', err.message);
    return { data: [], error: err };
  }
};

export const upsertDiaryEntry = async (userId, date, { mood, personal_notes, study_hours, goals_met }) => {
  try {
    const { error } = await supabase.from('calendar_diary').upsert({
      user_id: userId,
      date,
      mood: mood ?? null,
      personal_notes: personal_notes ?? '',
      study_hours: Number(study_hours) || 0,
      goals_met: goals_met ?? false,
    }, { onConflict: 'user_id,date' });
    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('Error upserting diary entry:', err);
    return { error: err };
  }
};

// Upload MCI/NMC certificate to Supabase Storage and update the profile row.
// Accepts: userId (string), file (File object).
// Returns: { url } on success, throws on failure.
export const uploadVerificationCertificate = async (userId, file) => {
  const ext = file.name.split('.').pop().toLowerCase();
  const path = `${userId}/${Date.now()}_mci_certificate.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('verification-documents')
    .upload(path, file, { cacheControl: '3600', upsert: true });
  if (uploadError) throw uploadError;
  const { data: urlData } = supabase.storage
    .from('verification-documents')
    .getPublicUrl(path);
  const url = urlData.publicUrl;
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      registration_certificate_url: url,
      verification_submitted_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (updateError) throw updateError;
  return { url };
};
