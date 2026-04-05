/**
 * aiService.js — Centralised AI service layer for iConnect
 *
 * ARCHITECTURE:
 *   All AI calls route through Supabase Edge Functions:
 *     - ai-orchestrator: Gemini, JWT auth, rate limiting, circuit breaker
 *     - gemini-proxy: Gemini-only, anon key auth (used by ChatBot chat mode only)
 *
 *   Client features:
 *     - Streaming: real-time token delivery via SSE for instant UX
 *     - Request tracing: x-trace-id header for end-to-end debugging
 *     - Unified error contract: all functions return { text, error } — never throws
 *     - Input truncation: prompts clamped to safe lengths before sending
 *     - Shared JSON parsing: single robust parser for all structured AI responses
 *
 * SEC-002/SEC-003: No API keys in the browser bundle. Ever.
 */
import { supabase } from './supabase';

// ── Configuration ───────────────────────────────────────────────────────────
const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const TIMEOUT_MS        = 20_000;  // Client timeout (slightly > server's 15s)
const MAX_PROMPT_CHARS  = 12_000;  // Match server-side limit

// ── Request tracing ─────────────────────────────────────────────────────────
function traceId() {
  return crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Streaming SSE reader ────────────────────────────────────────────────────
/**
 * Reads an SSE stream and calls onToken for each chunk.
 * Returns the full concatenated text when done.
 */
async function readSSEStream(response, onToken) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      if (payload === '[DONE]') continue;

      try {
        const parsed = JSON.parse(payload);
        if (parsed.error) throw new Error(parsed.error);
        const token = parsed.token || '';
        if (token) {
          fullText += token;
          if (onToken) onToken(token, fullText);
        }
      } catch { /* skip malformed chunks */ }
    }
  }

  return fullText;
}

// ── Core: call ai-orchestrator (JWT auth) ───────────────────────────────────
async function callOrchestrator(action, payload, maxTokens = 512, { stream = false, onToken = null } = {}) {
  try {
    let { data: { session }, error } = await supabase.auth.getSession();
    if (!session || error) {
      return { text: 'Please log in again to use AI features.', error: 'No active session' };
    }

    // Check if token expires within 60 seconds — refresh if so
    const expiresAt = session.expires_at;
    if (expiresAt && expiresAt - Math.floor(Date.now() / 1000) < 60) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed?.session) {
        session = refreshed.session;
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const trace = traceId();

    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-orchestrator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'X-Trace-Id': trace,
      },
      body: JSON.stringify({
        action,
        payload: {
          system: (payload.system || '').slice(0, MAX_PROMPT_CHARS),
          user:   (payload.user   || '').slice(0, MAX_PROMPT_CHARS),
        },
        max_tokens: maxTokens,
        stream,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const code = err.code || '';
      if (code === 'rate_limited') return { text: null, error: 'You\'ve sent too many requests. Please wait a moment.' };
      if (res.status === 401)      return { text: null, error: 'Session expired. Please refresh the page.' };
      if (res.status === 404)      return { text: null, error: 'AI service is unavailable. Please try again later.' };
      if (res.status === 429)      return { text: null, error: 'AI service is busy. Please wait a moment and try again.' };
      if (res.status === 502 || res.status === 503) return { text: null, error: 'AI service is temporarily unavailable. Please try again in a few seconds.' };
      return { text: null, error: err.error || `AI service error (${res.status})` };
    }

    // Streaming path
    if (stream && res.headers.get('content-type')?.includes('text/event-stream')) {
      const text = await readSSEStream(res, onToken);
      return { text: text || '', error: null };
    }

    // Non-streaming path
    const data = await res.json();
    return { text: data.data || data.text || '', error: null };

  } catch (e) {
    if (e.name === 'AbortError') return { text: null, error: 'AI request timed out. Please try again.' };
    return { text: null, error: e.message || 'Network error' };
  }
}

// ── Unified callAI — used by all 15 AI functions ────────────────────────────
async function callAI(systemPrompt, userMessage, maxTokens = 512, opts = {}) {
  return callOrchestrator('generic', { system: systemPrompt, user: userMessage }, maxTokens, opts);
}

// ── Shared JSON extraction helper ───────────────────────────────────────────
// Strategy: strip markdown fences → try full parse → extract first {...} or [...]
// Handles AI responses that wrap JSON in markdown code blocks or add extra text.
function parseAiJson(text) {
  if (!text || typeof text !== 'string') throw new Error('Empty AI response');
  const clean = text.replace(/```(?:json)?\s*|```/g, '').trim();

  // Fast path: entire string is valid JSON
  try { return JSON.parse(clean); } catch { /* fall through */ }

  // Extract first complete JSON object
  const objMatch = clean.match(/\{[\s\S]*\}/);
  if (objMatch) { try { return JSON.parse(objMatch[0]); } catch { /* fall through */ } }

  // Extract first complete JSON array
  const arrMatch = clean.match(/\[[\s\S]*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch { /* fall through */ } }

  throw new Error('Could not parse AI response as JSON');
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTED AI FUNCTIONS (15 features)
// All return { text, error } or { specificField, error } — never throws.
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. Explain a NEET-PG MCQ question ─────────────────────────────────────────
export async function explainQuestion(question, options, correctKey, existingExplanation) {
  const system = `You are a NEET-PG medical education expert. Explain MCQ answers concisely for PG aspirants.
Format: 2-3 sentences on WHY the correct answer is right, and briefly why the others are wrong. Keep it under 150 words.`;
  const optText = options.map(o => `${o.k}. ${o.v}`).join('\n');
  const msg = `Question: ${question}\n\nOptions:\n${optText}\n\nCorrect Answer: ${correctKey}${existingExplanation ? `\n\nHint: ${existingExplanation}` : ''}`;
  return callAI(system, msg, 256);
}

// ── 2. Generate a personalised study plan ─────────────────────────────────────
export async function generateStudyPlan(speciality, booksRead, quizScore, totalScore) {
  const system = `You are a NEET-PG study advisor. Create a brief, actionable 7-day study plan for a PG aspirant.
Use bullet points. Keep it under 200 words. Focus on high-yield topics for Indian PG exams.`;
  const msg = `Speciality: ${speciality || 'General Medicine'}
Books read this month: ${booksRead || 0}
Quiz score: ${quizScore || 0} pts / Total score: ${totalScore || 0} pts
Please generate a personalised 7-day study plan to improve weak areas.`;
  return callAI(system, msg, 400);
}

// ── 3. Generate a clinical case simulation ────────────────────────────────────
export async function getClinicalCase(speciality) {
  const system = `You are a clinical case generator for NEET-PG exam preparation.
Generate a short clinical vignette with:
1. Case presentation (3-4 sentences)
2. Three MCQ options for diagnosis/management
3. The correct answer with brief explanation
Format clearly with emojis. Keep under 250 words.`;
  const msg = `Generate a NEET-PG style clinical case for: ${speciality || 'Internal Medicine'}`;
  return callAI(system, msg, 512);
}

// ── 4. AI content audit for uploaded e-books ─────────────────────────────────
export async function auditContent(title, subject, description) {
  const system = `You are a medical content quality reviewer for a PG education platform.
Review the given content metadata and provide:
1. Quality score (1-10)
2. Target audience (MD/MS/DM/MCh level)
3. 2-3 improvement suggestions
4. Any content safety concerns
Keep it under 150 words. Be direct and helpful.`;
  const msg = `Title: ${title}\nSubject: ${subject || 'Unknown'}\nDescription: ${description || 'No description provided'}`;
  return callAI(system, msg, 300);
}

// ── 5. Predictive engagement alerts for super admins ─────────────────────────
export async function getPredictiveAlerts(stats) {
  const system = `You are a platform engagement analyst for a medical education app.
Based on usage statistics, generate 3-5 actionable alerts/recommendations.
Format as bullet points. Be specific and data-driven. Under 200 words.`;
  const msg = `Platform stats:
- Total active users: ${stats.totalUsers || 0}
- Average quiz score: ${stats.avgScore || 0}%
- Users with 0 activity last 7 days: ${stats.inactiveUsers || 0}
- Pending verifications: ${stats.pendingVerifications || 0}
- Most popular subject: ${stats.topSubject || 'Unknown'}
Generate engagement improvement alerts.`;
  return callAI(system, msg, 400);
}

// ── 6. Knowledge gap analysis ─────────────────────────────────────────────────
export async function analyzeKnowledgeGap(subjectScores) {
  const system = `You are a NEET-PG learning analytics expert.
Identify knowledge gaps from quiz performance data and suggest targeted interventions.
Format: 3-4 bullet points. Under 150 words.`;
  const subjectList = subjectScores
    .map(s => `${s.subject}: ${s.avgScore}% (${s.attempts} attempts)`)
    .join('\n');
  const msg = `Subject performance breakdown:\n${subjectList || 'No data yet'}\n\nIdentify top knowledge gaps and suggest study priorities.`;
  return callAI(system, msg, 300);
}

// ── 7. Doubt Buster — deep-dive answer for specific medical questions ─────────
export async function askDoubtBuster(question, opts = {}) {
  const system = `You are a senior medical educator specialising in NEET-PG exam preparation.
For the given doubt/question, provide a thorough explanation:
- Core concept explanation
- Clinical relevance
- Memory tips or mnemonics if applicable
- Common exam traps to avoid
Use bullet points. Keep under 300 words.`;
  return callAI(system, question, 600, opts);
}

// ── 8. Generate a 3-question reading comprehension quiz ───────────────────────
export async function generateReadingQuiz(bookTitle, subject) {
  const system = `You are a NEET-PG medical exam question setter.
Generate exactly 3 multiple-choice questions to test understanding of a medical e-book.
Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{"questions":[{"q":"question text","options":[{"k":"A","v":"option"},{"k":"B","v":"option"},{"k":"C","v":"option"},{"k":"D","v":"option"}],"answer":"A","explanation":"brief explanation under 60 words"}]}`;
  const msg = `Book title: ${bookTitle}\nSubject: ${subject || 'General Medicine'}\nGenerate 3 NEET-PG MCQs to test mastery of this book.`;
  const { text, error } = await callAI(system, msg, 800);
  if (error) return { questions: null, error };
  try {
    const parsed = parseAiJson(text);
    if (!Array.isArray(parsed.questions)) throw new Error('Invalid structure');
    return { questions: parsed.questions, error: null };
  } catch {
    return { questions: null, error: 'Could not parse quiz. Please try again.' };
  }
}

// ── 9. Generate a smart note + mnemonic from selected text ────────────────────
export async function generateSmartNote(originalText, subject) {
  const system = `You are a NEET-PG study coach. Compress the given medical text into:
1. A concise study note (max 80 words, bullet points)
2. A memorable mnemonic or memory tip
3. Up to 4 relevant topic tags (single words or short phrases)
Respond ONLY with valid JSON (no markdown):
{"note":"...","mnemonic":"...","tags":["tag1","tag2"]}`;
  const msg = `Subject: ${subject || 'Medicine'}\n\nText to compress:\n${originalText.slice(0, 1500)}`;
  const { text, error } = await callAI(system, msg, 400);
  if (error) return { note: null, mnemonic: null, tags: [], error };
  try {
    const parsed = parseAiJson(text);
    return { note: parsed.note || '', mnemonic: parsed.mnemonic || '', tags: parsed.tags || [], error: null };
  } catch {
    return { note: null, mnemonic: null, tags: [], error: 'Could not parse response.' };
  }
}

// ── 10. Personalised "For You" suggestions on login ──────────────────────────
export async function getPersonalizedSuggestions({ speciality, booksRead, quizScore, totalScore, weeklyMins, lastActive, recentSubjects = [] }) {
  const system = `You are a personalised learning advisor for NEET-PG medical exam aspirants on the iConnect platform.
Analyse the student's activity data and generate exactly 3 hyper-personalised study suggestions.
Each suggestion must directly relate to their specific data (scores, subjects studied, activity gaps).

Respond ONLY with valid JSON — no markdown, no extra text, no explanation outside the JSON:
[
  {
    "icon": "emoji",
    "title": "short action title (max 50 chars)",
    "reason": "personalised reason based on their data (max 75 chars)",
    "tag": "one of: Weak Area | Due Today | High Yield | Quick Win | Streak Risk | Trending",
    "action": "one of: ebooks | exam | learn | arena-student | calendar | case-sim"
  }
]`;

  const inactiveDays = lastActive
    ? Math.floor((Date.now() - new Date(lastActive)) / 86400000)
    : null;

  const msg = `Student profile:
- Speciality: ${speciality || 'General Medicine'}
- Books read this month: ${booksRead || 0}
- Quiz score: ${quizScore || 0} pts
- Total score: ${totalScore || 0} pts
- Weekly study time: ${Math.round(((weeklyMins || 0) / 60) * 10) / 10}h
- Days since last activity: ${inactiveDays !== null ? inactiveDays : 'unknown'}
- Recently studied subjects: ${recentSubjects.length > 0 ? recentSubjects.join(', ') : 'None yet'}

Generate 3 data-driven, personalised suggestions for this student.
Variation seed: ${new Date().toDateString()} — ensure variety; avoid repeating generic advice.`;

  const { text, error } = await callAI(system, msg, 600);
  if (error) return { suggestions: null, error };

  try {
    const parsed = parseAiJson(text);
    const arr = Array.isArray(parsed) ? parsed : parsed.suggestions;
    if (!Array.isArray(arr) || arr.length === 0) throw new Error('Empty or invalid array');
    return { suggestions: arr.slice(0, 4), error: null };
  } catch {
    return { suggestions: null, error: 'Could not parse suggestions.' };
  }
}

// ── 11. Generate a contextual study plan from clinical logs + persona ─────────
export async function generateContextualPlan({ speciality, weakSubjects, strongSubjects, peakHours, weeklyGoalHours, recentCases = [], examDate }) {
  const system = `You are a NEET-PG study planner. Build a personalised 7-day weekly plan.
Respond ONLY with valid JSON — no markdown, no extra text:
{"plan":[{"day":"Monday","tasks":[{"subject":"string","activity":"string","duration_mins":30}]}]}
Rules: each day has 2-4 tasks; schedule heavy topics during peak hours; revise recent clinical cases; avoid strong subjects unless consolidation needed.`;
  const daysToExam = examDate
    ? Math.max(0, Math.floor((new Date(examDate) - Date.now()) / 86400000))
    : null;
  const msg = `Speciality: ${speciality || 'General Medicine'}
Weak subjects: ${weakSubjects?.join(', ') || 'unknown'}
Strong subjects: ${strongSubjects?.join(', ') || 'unknown'}
Peak study hours: ${peakHours || 'morning'}
Weekly goal: ${weeklyGoalHours || 20} hours
Recent clinical cases: ${recentCases.slice(0, 5).join(', ') || 'none'}
${daysToExam !== null ? `Days until exam: ${daysToExam}` : ''}
Generate a focused 7-day plan.`;
  const { text, error } = await callAI(system, msg, 900);
  if (error) return { plan: null, error };
  try {
    const parsed = parseAiJson(text);
    if (!Array.isArray(parsed.plan)) throw new Error('Invalid plan structure');
    return { plan: parsed.plan, error: null };
  } catch {
    return { plan: null, error: 'Could not parse study plan. Please try again.' };
  }
}

// ── 12. Assess study fatigue level from activity patterns ─────────────────────
export async function assessFatigueLevel({ dailyMinutes = [], streak = 0, avgSessionsPerDay = 0 }) {
  const system = `You are a medical student wellbeing advisor.
Assess cognitive fatigue from study pattern data and give concise feedback.
Respond ONLY with valid JSON:
{"level":"low|medium|high","message":"one sentence summary","tips":["tip1","tip2","tip3"]}`;
  const recentAvg = dailyMinutes.length
    ? Math.round(dailyMinutes.slice(-7).reduce((a, b) => a + b, 0) / Math.min(dailyMinutes.length, 7))
    : 0;
  const msg = `Study data:
- Recent daily average: ${recentAvg} minutes
- Current streak: ${streak} days
- Avg sessions per day: ${avgSessionsPerDay}
- Last 7 days (minutes): ${dailyMinutes.slice(-7).join(', ') || '0'}
Assess fatigue and provide 3 short recovery/optimization tips.`;
  const { text, error } = await callAI(system, msg, 300);
  if (error) return { level: 'medium', message: null, tips: [], error };
  try {
    const parsed = parseAiJson(text);
    return { level: parsed.level || 'medium', message: parsed.message || '', tips: parsed.tips || [], error: null };
  } catch {
    return { level: 'medium', message: 'Unable to assess — keep studying consistently.', tips: [], error: null };
  }
}

// ── 13. Generate active recall audio script for a topic ───────────────────────
export async function generateActiveRecallAudio(topic, subject) {
  const system = `You are a NEET-PG tutor creating a spoken active-recall drill.
Generate a short verbal quiz script (6-8 Q&A pairs) for the given topic.
Respond ONLY with valid JSON:
{"script":"Full spoken script with Q&A","keywords":["key1","key2","key3","key4","key5"]}
Keep the script under 250 words. Use clear spoken language — it will be read aloud.`;
  const msg = `Topic: ${topic}\nSubject: ${subject || 'Medicine'}\nGenerate an active recall spoken script.`;
  const { text, error } = await callAI(system, msg, 600);
  if (error) return { script: null, keywords: [], error };
  try {
    const parsed = parseAiJson(text);
    return { script: parsed.script || '', keywords: parsed.keywords || [], error: null };
  } catch {
    return { script: null, keywords: [], error: 'Could not generate recall script.' };
  }
}

// ── 14. Generate spaced repetition flashcards from wrong MCQ answers ──────────
export async function generateSpacedRepetitionCards(wrongAnswers, subject) {
  const system = `You are a NEET-PG flashcard creator.
For each wrong MCQ answer provided, generate one concise flashcard.
Respond ONLY with valid JSON (no markdown):
{"cards":[{"front":"key concept question (max 60 chars)","back":"clear explanation with correct answer (max 120 chars)","difficulty":"easy|medium|hard"}]}`;
  const items = wrongAnswers.slice(0, 10).map((w, i) =>
    `${i + 1}. Q: ${w.question}\n   Correct: ${w.correct_option} — ${w.correct_text}\n   Your answer: ${w.user_option}`
  ).join('\n\n');
  const msg = `Subject: ${subject || 'Medicine'}\n\nWrong answers to convert:\n${items}`;
  const { text, error } = await callAI(system, msg, 800);
  if (error) return { cards: null, error };
  try {
    const parsed = parseAiJson(text);
    if (!Array.isArray(parsed.cards)) throw new Error('Invalid structure');
    return { cards: parsed.cards, error: null };
  } catch {
    return { cards: null, error: 'Could not parse flashcards.' };
  }
}

// ── 15. Grade a subjective / open-ended answer ────────────────────────────────
export async function gradeSubjectiveAnswer(question, studentAnswer, rubric) {
  const system = `You are a NEET-PG examiner grading a short-answer response.
Assess the answer against the rubric and respond ONLY with valid JSON:
{"score":7,"maxScore":10,"feedback":"one concise sentence (max 80 chars)","suggestions":["improvement 1","improvement 2"]}`;
  const msg = `Question: ${question}\n\nRubric: ${rubric || 'Accuracy, completeness, clinical relevance (10 points)'}\n\nStudent answer:\n${studentAnswer.slice(0, 800)}`;
  const { text, error } = await callAI(system, msg, 400);
  if (error) return { score: null, maxScore: 10, feedback: null, suggestions: [], error };
  try {
    const parsed = parseAiJson(text);
    return { score: parsed.score ?? null, maxScore: parsed.maxScore ?? 10, feedback: parsed.feedback || '', suggestions: parsed.suggestions || [], error: null };
  } catch {
    return { score: null, maxScore: 10, feedback: 'Could not grade answer.', suggestions: [], error: null };
  }
}
