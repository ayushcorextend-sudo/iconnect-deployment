import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const payload = await req.json()
    const oldRecord = payload.old_record
    const newRecord = payload.record

    console.log('[welcome-email] payload received:', JSON.stringify({
      type: payload.type,
      newStatus: newRecord?.status,
      oldStatus: oldRecord?.status,
      profileEmail: newRecord?.email,
      id: newRecord?.id,
    }))

    // Only trigger when status changes to 'active' (doctor approved)
    // approve() in MCIVerificationQueue writes: { status: 'active', verified: true }
    if (!newRecord || newRecord.status !== 'active' || oldRecord?.status === 'active') {
      console.log('[welcome-email] skipped — condition not met')
      return new Response(JSON.stringify({ skipped: true }), { status: 200 })
    }

    let doctorEmail: string | null = newRecord.email || null
    const doctorName = newRecord.name || 'Doctor'
    const mciNumber  = newRecord.mci_number || ''
    const college    = newRecord.college || ''

    // If email is not stored in profiles, fall back to auth.users lookup
    if (!doctorEmail && newRecord.id) {
      console.log('[welcome-email] email absent in profiles — fetching from auth.users for id:', newRecord.id)
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      const { data: { user }, error: authErr } = await admin.auth.admin.getUserById(newRecord.id)
      if (authErr) {
        console.log('[welcome-email] auth lookup error:', authErr.message)
      } else {
        doctorEmail = user?.email ?? null
        console.log('[welcome-email] resolved email from auth.users:', doctorEmail)
      }
    }

    if (!doctorEmail) {
      console.log('[welcome-email] skipped — no email found for id:', newRecord?.id)
      return new Response(JSON.stringify({ error: 'No email found' }), { status: 400 })
    }

    if (!RESEND_API_KEY) {
      console.log('[welcome-email] no RESEND_API_KEY set — would send to', doctorEmail)
      return new Response(JSON.stringify({ skipped: true, reason: 'no key' }), { status: 200 })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'iConnect <onboarding@resend.dev>',
        to: doctorEmail,
        subject: '🎉 Your iConnect Account Has Been Approved!',
        html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
.container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
.header { background: #1E1B4B; padding: 30px; text-align: center; }
.header h1 { color: white; margin: 0; font-size: 24px; }
.header p { color: rgba(255,255,255,0.7); margin: 8px 0 0; }
.body { padding: 30px; }
.info-box { background: #F8FAFC; border-radius: 8px; padding: 16px; margin: 16px 0; }
.info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #E5E7EB; font-size: 14px; }
.info-row:last-child { border-bottom: none; }
.label { color: #6B7280; }
.value { font-weight: 600; color: #111827; }
.btn { display: inline-block; background: #1E1B4B; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0; }
.footer { background: #F8FAFC; padding: 20px; text-align: center; font-size: 12px; color: #9CA3AF; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>&#127881; Welcome to iConnect!</h1>
    <p>Your account has been approved</p>
  </div>
  <div class="body">
    <p>Dear <strong>${doctorName}</strong>,</p>
    <p>We are pleased to inform you that your iConnect account has been <strong>verified and activated</strong> by our admin team.</p>
    <div class="info-box">
      <div class="info-row"><span class="label">Email</span><span class="value">${doctorEmail}</span></div>
      ${mciNumber ? `<div class="info-row"><span class="label">MCI Number</span><span class="value">${mciNumber}</span></div>` : ''}
      ${college ? `<div class="info-row"><span class="label">College</span><span class="value">${college}</span></div>` : ''}
    </div>
    <p>You can now log in and access the full iConnect platform — e-books, exam prep, leaderboard, and more.</p>
    <a href="https://iconnect-med.vercel.app" class="btn">Access iConnect Platform &rarr;</a>
    <p style="font-size:13px;color:#6B7280;">If you have any questions, contact us at support@iconnect.in</p>
  </div>
  <div class="footer">&copy; 2026 iConnect &mdash; Icon Lifescience Medical Education Platform</div>
</div>
</body></html>`,
      }),
    })

    const resBody = await res.text()
    console.log('[welcome-email] Resend response:', res.status, resBody)

    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: 'Resend API error', status: res.status, detail: resBody }),
        { status: 502 },
      )
    }

    return new Response(JSON.stringify({ sent: true, to: doctorEmail }), { status: 200 })
  } catch (error) {
    console.log('[welcome-email] caught error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
