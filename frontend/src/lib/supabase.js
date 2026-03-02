import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
)

// Hardcoded admin credentials for demo + offline fallback
const MOCK_USERS = [
  {
    email: 'admin@iconnect.in',
    password: 'Admin@123',
    role: 'superadmin',
    name: 'Dr. Rajesh Kumar',
    id: '99810dee-0942-40e4-a791-7cd7aa1d0766'
  },
  {
    email: 'content@iconnect.in',
    password: 'Content@123',
    role: 'contentadmin',
    name: 'Priya Sharma',
    id: 'e977be55-bb7d-4cc3-ba01-5a5aad179a01'
  },
]

// Race a promise against a timeout
const withTimeout = (promise, ms = 7000) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    )
  ])

// ─── AUTH ────────────────────────────────────────────────────

export const authSignIn = async (email, password) => {
  // ONLINE PATH: Try Supabase first
  let networkTimeout = false
  try {
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password })
    )
    if (error) throw error

    // Fetch profile — don't let this crash the whole login
    let profile = null
    try {
      const { data: p } = await withTimeout(
        supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()
      )
      profile = p
    } catch (_) {}

    const role = profile?.role || 'doctor'
    const name = profile?.name || email

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
    return { role, name, mode: 'online' }

  } catch (err) {
    // Only treat as truly offline if it was a network timeout
    if (err.message === 'timeout') networkTimeout = true

    // FALLBACK 1: Check mock admin users
    const mock = MOCK_USERS.find(
      u => u.email === email && u.password === password
    )
    if (mock) {
      // mode='offline' only when Supabase is truly unreachable
      const mode = networkTimeout ? 'offline' : 'demo'
      localStorage.setItem(
        'iconnect_session',
        JSON.stringify({
          userId: mock.id,
          email,
          role: mock.role,
          name: mock.name,
          mode,
        })
      )
      return { role: mock.role, name: mock.name, mode }
    }

    // FALLBACK 2: Check locally registered users
    const localUsers = JSON.parse(
      localStorage.getItem('iconnect_users') || '[]'
    )
    const found = localUsers.find(
      u => u.email === email && u.password === password
    )
    if (found) {
      const mode = networkTimeout ? 'offline' : 'demo'
      localStorage.setItem(
        'iconnect_session',
        JSON.stringify({
          userId: found.id,
          email,
          role: 'doctor',
          name: found.name,
          mode,
        })
      )
      return { role: 'doctor', name: found.name, mode }
    }

    // Nothing matched — real wrong password
    throw new Error('Invalid email or password. Please try again.')
  }
}

export const authSignOut = async () => {
  // Preserve theme and onboarding state across sessions
  const keep = ['iconnect_theme', 'iconnect_onboarding', 'iconnect_onboarded']
  Object.keys(localStorage)
    .filter(k => k.startsWith('iconnect_') && !keep.includes(k))
    .forEach(k => localStorage.removeItem(k))
  try { await supabase.auth.signOut() } catch (_) {}
}

export const getStoredSession = () => {
  try {
    const raw = localStorage.getItem('iconnect_session')
    return raw ? JSON.parse(raw) : null
  } catch (_) {
    return null
  }
}

export const registerUser = async (email, password, profile) => {
  // ONLINE PATH
  try {
    const { data, error } = await withTimeout(
      supabase.auth.signUp({ email, password })
    )
    if (error) {
      if (error.message?.toLowerCase().includes('already')) {
        throw new Error('An account with this email already exists.')
      }
      throw error
    }
    // Insert profile row — failure here is non-fatal
    try {
      await supabase
        .from('profiles')
        .insert([{ id: data.user.id, email, role: 'doctor', ...profile }])
    } catch (_) {}
    return { success: true, mode: 'online' }

  } catch (e) {
    // Re-throw "already exists" — it is a real error
    if (e.message?.includes('already')) throw e

    // OFFLINE PATH: Save to localStorage
    const localUsers = JSON.parse(
      localStorage.getItem('iconnect_users') || '[]'
    )
    if (localUsers.find(u => u.email === email)) {
      throw new Error('An account with this email already exists.')
    }
    localUsers.push({
      id: `local_${Date.now()}`,
      email,
      password,
      role: 'doctor',
      verified: false,
      ...profile
    })
    localStorage.setItem('iconnect_users', JSON.stringify(localUsers))
    return { success: true, mode: 'offline' }
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
  date: a.date,
  status: a.status,
  downloads: a.downloads || 0,
  pages: a.pages || 0,
  emoji: a.emoji || '📗',
  access: a.access || 'all'
})

export const fetchArtifacts = async () => {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('artifacts')
        .select('*')
        .order('id', { ascending: false })
    )
    if (error) throw error
    const mapped = data.map(mapRow)
    // Cache for offline fallback
    localStorage.setItem('iconnect_artifacts', JSON.stringify(mapped))
    return mapped
  } catch (_) {
    // Return cached data if available
    try {
      const cached = localStorage.getItem('iconnect_artifacts')
      return cached ? JSON.parse(cached) : []
    } catch (_) {
      return []
    }
  }
}

export const approveArtifact = async (id) => {
  try {
    await withTimeout(
      supabase.from('artifacts').update({ status: 'approved' }).eq('id', id)
    )
  } catch (_) {}
}

export const rejectArtifact = async (id) => {
  try {
    await withTimeout(
      supabase.from('artifacts').delete().eq('id', id)
    )
  } catch (_) {}
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
  } catch (_) {
    // Return a local artifact so the UI still updates
    return { ...artifact, id: Date.now(), status: 'pending' }
  }
}
