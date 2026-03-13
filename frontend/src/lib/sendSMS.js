/**
 * SMS notification stub — replace with Twilio/MSG91 integration when ready.
 * All calls log to console in development; no external calls are made.
 */
export async function sendSMS(phone, message) {
  if (!phone || !message) return;
  // TODO: integrate Twilio or MSG91
  // Example Twilio call (server-side only, use a Supabase Edge Function):
  // POST https://<project>.supabase.co/functions/v1/send-sms
  // { to: phone, body: message }
  console.info('[sendSMS] stub — would send to', phone, ':', message);
}
