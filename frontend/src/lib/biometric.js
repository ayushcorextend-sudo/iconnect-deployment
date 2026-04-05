/**
 * biometric.js — WebAuthn biometric authentication helper (Face ID, Touch ID,
 * Android fingerprint, Windows Hello).
 *
 * SCOPE OF THIS MODULE (client-side scaffold):
 * - Feature detection
 * - Register a new credential (returns credential ID + public key to backend)
 * - Authenticate with existing credential
 * - Decode helpers
 *
 * WHAT YOU MUST STILL DO SERVER-SIDE (not landed in this session):
 * 1. DB migration for credentials table (place in supabase/migrations/):
 *      YYYYMMDDHHMMSS_webauthn_credentials.sql
 *      create table webauthn_credentials (
 *        id uuid primary key default gen_random_uuid(),
 *        user_id uuid references auth.users not null,
 *        credential_id text not null unique,
 *        public_key text not null,
 *        counter bigint default 0,
 *        transports text[],
 *        device_name text,
 *        created_at timestamptz default now(),
 *        last_used_at timestamptz
 *      );
 *      -- RLS: users see only their own
 * 2. Edge function `webauthn-challenge` that:
 *      - Generates random challenge (stored in a short-lived table or kv)
 *      - Returns challenge + rp info + user info
 * 3. Edge function `webauthn-verify` that:
 *      - Uses @simplewebauthn/server to verify attestation/assertion
 *      - Persists credential on register, updates counter on auth
 *      - Returns a Supabase JWT so user is signed in
 * 4. Add `VITE_RP_ID` to frontend/.env.local (your domain, e.g. iconnect-med.vercel.app)
 * 5. Wire into LoginPage as a "Sign in with Face ID / Touch ID" button
 *    that calls authenticateWithBiometric() on mount if a credential exists.
 */

const RP_ID = import.meta.env.VITE_RP_ID || window.location.hostname;
const RP_NAME = 'iConnect';

/** Feature detection — call before showing biometric UI */
export function isBiometricSupported() {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  );
}

/** Check if the device actually has a platform authenticator (Face ID, etc.) */
export async function hasPlatformAuthenticator() {
  if (!isBiometricSupported()) return false;
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const byte of bytes) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBuffer(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice((base64.length + 3) % 4);
  const raw = atob(padded);
  const buffer = new ArrayBuffer(raw.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return buffer;
}

/**
 * Register a new biometric credential for the current signed-in user.
 * REQUIRES: webauthn-challenge + webauthn-verify edge functions to be deployed.
 *
 * @param {object} params - { supabase, userId, userEmail }
 * @returns {Promise<boolean>} true on success
 */
export async function registerBiometric({ supabase, userId, userEmail }) {
  if (!await hasPlatformAuthenticator()) {
    console.warn('[biometric] no platform authenticator on device');
    return false;
  }

  try {
    // 1. Get challenge from backend
    const { data: challengeData, error: challengeErr } = await supabase.functions.invoke(
      'webauthn-challenge',
      { body: { mode: 'register', userId } }
    );
    if (challengeErr) throw challengeErr;

    // 2. Create credential via navigator.credentials.create
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: base64UrlToBuffer(challengeData.challenge),
        rp: { id: RP_ID, name: RP_NAME },
        user: {
          id: base64UrlToBuffer(challengeData.userHandle),
          name: userEmail,
          displayName: userEmail,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },   // ES256
          { type: 'public-key', alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    });

    if (!credential) return false;

    // 3. Send attestation to backend for verification + storage
    const payload = {
      id: credential.id,
      rawId: bufferToBase64Url(credential.rawId),
      type: credential.type,
      response: {
        attestationObject: bufferToBase64Url(credential.response.attestationObject),
        clientDataJSON: bufferToBase64Url(credential.response.clientDataJSON),
      },
    };
    const { error: verifyErr } = await supabase.functions.invoke('webauthn-verify', {
      body: { mode: 'register', credential: payload, userId },
    });
    if (verifyErr) throw verifyErr;

    return true;
  } catch (err) {
    console.warn('[biometric] register failed:', err.message);
    return false;
  }
}

/**
 * Authenticate an existing user via biometric.
 * Returns a Supabase session on success, null on failure.
 *
 * @param {object} params - { supabase, email }
 */
export async function authenticateWithBiometric({ supabase, email }) {
  if (!isBiometricSupported()) return null;

  try {
    const { data: challengeData, error: challengeErr } = await supabase.functions.invoke(
      'webauthn-challenge',
      { body: { mode: 'authenticate', email } }
    );
    if (challengeErr) throw challengeErr;

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: base64UrlToBuffer(challengeData.challenge),
        rpId: RP_ID,
        allowCredentials: (challengeData.allowedCredentials || []).map((c) => ({
          id: base64UrlToBuffer(c.id),
          type: 'public-key',
          transports: c.transports,
        })),
        userVerification: 'required',
        timeout: 60000,
      },
    });

    if (!credential) return null;

    const payload = {
      id: credential.id,
      rawId: bufferToBase64Url(credential.rawId),
      type: credential.type,
      response: {
        authenticatorData: bufferToBase64Url(credential.response.authenticatorData),
        clientDataJSON: bufferToBase64Url(credential.response.clientDataJSON),
        signature: bufferToBase64Url(credential.response.signature),
        userHandle: credential.response.userHandle
          ? bufferToBase64Url(credential.response.userHandle)
          : null,
      },
    };

    const { data, error } = await supabase.functions.invoke('webauthn-verify', {
      body: { mode: 'authenticate', credential: payload, email },
    });
    if (error) throw error;

    // data.session should contain { access_token, refresh_token }
    if (data?.session) {
      await supabase.auth.setSession(data.session);
      return data.session;
    }
    return null;
  } catch (err) {
    console.warn('[biometric] authenticate failed:', err.message);
    return null;
  }
}
