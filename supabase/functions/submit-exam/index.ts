/**
 * submit-exam — Supabase Edge Function
 *
 * Atomically submits an exam attempt with:
 * - Idempotency key check (prevents double-submission)
 * - Advisory lock (prevents race conditions)
 * - Score calculation server-side
 * - Notification dispatch on pass
 *
 * POST /functions/v1/submit-exam
 * Body: { subject_id, answers: { [questionId]: chosenKey }, idempotency_key }
 * Auth: Bearer JWT required
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const PASS_THRESHOLD = 0.6; // 60% to pass

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const traceId = req.headers.get('x-trace-id') || crypto.randomUUID();
  const log = (event: string, data?: unknown) =>
    console.log(JSON.stringify({ traceId, event, ts: Date.now(), ...( data ? { data } : {} ) }));

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { subject_id, answers, idempotency_key } = body;

    if (!subject_id || !answers || !idempotency_key) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    log('exam_submit_start', { userId: user.id, subject_id });

    // ── Idempotency check ─────────────────────────────────────────────────
    const { data: existing } = await serviceClient
      .from('idempotency_keys')
      .select('result')
      .eq('key', idempotency_key)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing?.result) {
      log('exam_submit_duplicate', { idempotency_key });
      return new Response(JSON.stringify({ ...existing.result, isDuplicate: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Fetch questions for scoring ────────────────────────────────────────
    const { data: questions, error: qErr } = await serviceClient
      .from('exam_questions')
      .select('id, correct')
      .eq('subject_id', subject_id);

    if (qErr || !questions) {
      return new Response(JSON.stringify({ error: 'Could not fetch questions' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const total = questions.length;
    const correct = questions.filter(q => answers[q.id] === q.correct).length;
    const passed = total > 0 && (correct / total) >= PASS_THRESHOLD;

    // ── Advisory lock to prevent concurrent submissions ───────────────────
    await serviceClient.rpc('acquire_exam_lock', {
      p_user_id: user.id,
      p_subject_id: subject_id,
    });

    // ── Insert attempt ────────────────────────────────────────────────────
    const { data: attempt, error: insertErr } = await serviceClient
      .from('exam_attempts')
      .insert({
        user_id: user.id,
        subject_id,
        score: correct,
        total,
        passed,
        answers: Object.entries(answers).map(([id, ans]) => ({ id, ans })),
      })
      .select()
      .single();

    if (insertErr) {
      log('exam_submit_insert_error', { error: insertErr.message });
      // Handle cooldown error from trigger
      if (insertErr.message?.includes('exam_cooldown')) {
        return new Response(JSON.stringify({ error: 'Please wait before retrying the exam.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Notify on pass ────────────────────────────────────────────────────
    if (passed) {
      const { data: subject } = await serviceClient
        .from('exam_subjects').select('name').eq('id', subject_id).maybeSingle();
      await serviceClient.from('notifications').insert({
        user_id: user.id,
        title: 'Exam Passed! 🎉',
        body: `You scored ${correct}/${total} on ${subject?.name || 'the exam'}. Great work!`,
        type: 'success',
        icon: '🏆',
        channel: 'in_app',
        is_read: false,
      });
    }

    // ── Store idempotency key ─────────────────────────────────────────────
    const result = { attempt_id: attempt.id, score: correct, total, passed };
    await serviceClient.from('idempotency_keys').insert({
      key: idempotency_key,
      endpoint: 'exam_attempt',
      user_id: user.id,
      payload_hash: subject_id, // simplified — full hash on client
      result,
    });

    log('exam_submit_success', { attempt_id: attempt.id, score: correct, total, passed });

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error(JSON.stringify({ traceId, event: 'exam_submit_unhandled', error: (err as Error).message }));
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
