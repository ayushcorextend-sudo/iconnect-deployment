# OTP Rate Limiting — Server-Side Requirements

## Problem
The OTP send endpoint has no server-side rate limiting. An attacker can automate OTP requests
to drain the SMS budget or enumerate valid phone numbers/emails.

## Client-Side (implemented — defense in depth)
- After sending OTP: 60-second cooldown on the Send OTP button
- Failed attempt tracking in localStorage with progressive lockout:
  - 5 failed attempts in 10 min → 5-minute lockdown
  - 10 total failed attempts → 30-minute lockdown
- Lockdown state persists across page refreshes (localStorage key: `iconnect_otp_attempts`)

## Server-Side (Ayush must configure)

### 1. Supabase Auth Rate Limits
In Supabase Dashboard → Project Settings → Auth → Rate Limits:
- `Max emails per hour`: set to 5 (default is high)
- `Max OTPs per hour`: set to 5
- `SMTP rate limit`: configure per your email provider limits

### 2. Per-IP Rate Limiting via Supabase Edge Function
Option A — Supabase built-in:
- The `auth.v1.otp` endpoint can be wrapped in a custom Edge Function that checks
  a rate limit table before forwarding to Supabase Auth.

Option B — Cloudflare WAF rules (recommended for production):
```
Rule: if request.uri.path = "/auth/v1/otp" and rate(1m) > 5
Then: block with 429 Too Many Requests
```

### 3. CAPTCHA (optional but recommended for public registration)
Supabase Auth supports Cloudflare Turnstile and hCaptcha natively:
1. Supabase Dashboard → Auth → Bot and Abuse Protection
2. Add your Turnstile Site Key
3. On the client: add `<div class="cf-turnstile" data-sitekey="...">` to Login.jsx
4. Pass the token to `supabase.auth.signInWithOtp({ email, options: { captchaToken } })`

A TODO marker has been placed in Login.jsx where the CAPTCHA widget should be inserted.

## Monitoring
Set up an alert in Supabase Dashboard → Auth → Logs when:
- More than 20 OTP send events from a single IP in 5 minutes
- More than 5 failed OTP verifications from a single user in 10 minutes
