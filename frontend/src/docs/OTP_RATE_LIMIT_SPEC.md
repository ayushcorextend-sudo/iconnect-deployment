# OTP Rate Limiting Specification

## Problem
The previous client-side localStorage rate limiting (BUG-T) was security theater:
- Bypassed instantly via DevTools localStorage.removeItem('iconnect_otp_attempts')
- Not shared across devices (attacker uses a different browser)
- Provided false confidence that enumeration attacks were blocked

## Server-Side Rate Limiting (Required)

### Supabase Auth Config
Set in Supabase Dashboard → Authentication → Rate Limits:

| Setting | Recommended Value | Purpose |
|---------|------------------|---------|
| RATE_LIMIT_EMAIL_SENT | 5 per hour per email | Prevents email enumeration |
| RATE_LIMIT_SIGN_INS | 30 per hour per IP | Brute force protection |

### Cloudflare WAF Rules (Recommended)
Rate limit: 10 OTP requests per 5 minutes per IP on path /auth/v1/otp

## Client-Side UX (What Remains)
The 60-second resend cooldown in Login.jsx (otpTimer) is purely UX convenience only.
It prevents accidental double-clicks — NOT a security control.

## Manual Steps for Ayush
1. Open: Supabase Dashboard → Project Settings → Authentication → Rate Limits
2. Set Email OTP limit to 5 per hour per address
3. Enable Protect against bots (hCaptcha integration in Supabase Auth)
4. Review Cloudflare dashboard — add WAF rules if applicable
