import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ALLOWED_ORIGIN = 'https://iconnect-med.vercel.app'
const ALLOWED_LOCAL_ORIGINS = new Set(['http://localhost:3000', 'http://localhost:5173'])

const corsHeaders = (origin: string) => ({
  'Access-Control-Allow-Origin': origin === ALLOWED_ORIGIN || ALLOWED_LOCAL_ORIGINS.has(origin) ? origin : ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
})

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

function approvalHtml(doctorName: string, doctorEmail: string, mciNumber: string, college: string): string {
  const n = escapeHtml(doctorName), e = escapeHtml(doctorEmail), m = escapeHtml(mciNumber), c = escapeHtml(college)
  return `<!DOCTYPE html>
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
    <p>Dear <strong>${n}</strong>,</p>
    <p>We are pleased to inform you that your iConnect account has been <strong>approved</strong> by our admin team.</p>
    <div class="info-box">
      <div class="info-row"><span class="label">Email</span><span class="value">${e}</span></div>
      <div class="info-row"><span class="label">MCI Number</span><span class="value">${m}</span></div>
      <div class="info-row"><span class="label">College</span><span class="value">${c}</span></div>
    </div>
    <p>You can now login using the email and password you set during registration.</p>
    <a href="https://iconnect-med.vercel.app" class="btn">Access iConnect Platform &rarr;</a>
    <p style="font-size:13px;color:#6B7280;">If you have any questions, contact us at support@iconnect.in</p>
  </div>
  <div class="footer">&copy; 2026 iConnect &mdash; Icon Lifescience Medical Education Platform</div>
</div>
</body></html>`
}

function rejectionHtml(doctorName: string, _doctorEmail: string, mciNumber: string, rejectionReason: string): string {
  const n = escapeHtml(doctorName), m = escapeHtml(mciNumber), r = escapeHtml(rejectionReason)
  const reasonBlock = r
    ? `<div class="info-box"><strong>Reason provided:</strong><br>${r}</div>`
    : ''
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
.container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
.header { background: #374151; padding: 30px; text-align: center; }
.header h1 { color: white; margin: 0; font-size: 22px; }
.header p { color: rgba(255,255,255,0.7); margin: 8px 0 0; }
.body { padding: 30px; }
.info-box { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 14px; color: #374151; }
.footer { background: #F8FAFC; padding: 20px; text-align: center; font-size: 12px; color: #9CA3AF; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>Account Verification Update</h1>
    <p>iConnect &mdash; Icon Lifescience</p>
  </div>
  <div class="body">
    <p>Dear <strong>${n}</strong>,</p>
    <p>After reviewing your registration (MCI: ${m}), we were unable to verify your account at this time.</p>
    ${reasonBlock}
    <p>Please contact <strong>support@iconnect.in</strong> with your correct MCI registration documents to resolve this.</p>
    <p style="font-size:13px;color:#6B7280;">If you believe this is an error, please reach out with your MCI certificate and a photo ID.</p>
  </div>
  <div class="footer">&copy; 2026 iConnect &mdash; Icon Lifescience Medical Education Platform</div>
</div>
</body></html>`
}

serve(async (req) => {
  const origin = req.headers.get('origin') || ''

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) })
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''

  let body: {
    doctorEmail: string
    doctorName: string
    mciNumber?: string
    college?: string
    approved: boolean
    rejectionReason?: string
  }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders(origin), 'content-type': 'application/json' },
    })
  }

  const { doctorEmail, doctorName, mciNumber = '', college = '', approved, rejectionReason = '' } = body

  if (!RESEND_API_KEY) {
    console.log(`[send-approval-email] No RESEND_API_KEY — would send ${approved ? 'approval' : 'rejection'} email to ${doctorEmail}`)
    return new Response(JSON.stringify({ success: true, note: 'no key' }), {
      status: 200,
      headers: { ...corsHeaders(origin), 'content-type': 'application/json' },
    })
  }

  const subject = approved
    ? '🎉 Your iConnect Account Has Been Approved!'
    : 'iConnect Account Verification Update'

  const html = approved
    ? approvalHtml(doctorName, doctorEmail, mciNumber, college)
    : rejectionHtml(doctorName, doctorEmail, mciNumber, rejectionReason)

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'iConnect <onboarding@resend.dev>',
        to: doctorEmail,
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return new Response(JSON.stringify({ error: `Resend error: ${res.status}`, detail: errText }), {
        status: 502,
        headers: { ...corsHeaders(origin), 'content-type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders(origin), 'content-type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Email send failed', detail: String(err) }), {
      status: 502,
      headers: { ...corsHeaders(origin), 'content-type': 'application/json' },
    })
  }
})
