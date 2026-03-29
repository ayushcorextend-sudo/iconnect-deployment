/**
 * aiService.js — Centralised AI service layer for iConnect
 *
 * ROUTING:
 *   USE_EDGE_FUNCTION=true  → all calls go through /functions/v1/ai-orchestrator
 *                             (server-side NVIDIA→Gemini routing, circuit breaker, rate limit)
 *   USE_EDGE_FUNCTION=false → direct client calls (NVIDIA first, Gemini fallback)
 *                             Flip to true after deploying the ai-orchestrator edge function.
 *
 * See: src/docs/EDGE_FUNCTION_SPEC.md for edge function details.
 * All functions return { text, error } — never throws.
 */
import { supabase } from './supabase';

// ── Feature flag ─────────────────────────────────────────────────────────────
// Set to true once supabase/functions/ai-orchestrator is deployed.
const USE_EDGE_FUNCTION = false;

// ── Edge function proxy (Flaw #14: no client-side API keys) ──────────────────
// SEC-002/SEC-003: No hardcoded URLs or keys — read from env only.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';

async function callAIViaEdge(action, payload, maxTokens = 512) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return { text: null, error: 'Not authenticated' };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-orchestrator`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, payload, max_tokens: maxTokens }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { text: null, error: err.error || `AI service error ${res.status}` };
    }

    const data = await res.json();
    return { text: data.data || data.text || '', error: null };
  } catch (e) {
    if (e.name === 'AbortError') return { text: null, error: 'AI request timed out' };
    return { text: null, error: e.message || 'Network error' };
  }
}

// ── Direct callers (used when USE_EDGE_FUNCTION=false) ───────────────────────
// SEC-003: Supabase anon key read from env — never hardcoded.
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// SEC-002: NVIDIA API key is REMOVED from the browser bundle.
// It must be stored as a Supabase Edge Function secret (NVIDIA_API_KEY).
// When USE_EDGE_FUNCTION=true, the ai-orchestrator edge function handles NVIDIA routing.
// When USE_EDGE_FUNCTION=false, NVIDIA is unavailable client-side — only Gemini is used.
// See: src/docs/AI_EDGE_FUNCTION_SPEC.md for the edge function specification.

async function callGemini(systemPrompt, userMessage, maxTokens = 512) {
  // EXAM-1: AbortController timeout — matches the 15s in callAIViaEdge
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/gemini-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        maxOutputTokens: maxTokens,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { text: null, error: err.error || `API error ${res.status}` };
    }
    const data = await res.json();
    return { text: data.text || '', error: null };
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') return { text: null, error: 'AI is taking too long. Please try again.' };
    return { text: null, error: e.message || 'Network error' };
  }
}

// ── Unified callAI — routes to edge function or Gemini direct ────────────────
// NVIDIA is only available via the ai-orchestrator edge function (USE_EDGE_FUNCTION=true).
// Client-side direct path uses Gemini only — NVIDIA key is no longer in the browser bundle.
async function callAI(systemPrompt, userMessage, maxTokens = 512) {
  if (USE_EDGE_FUNCTION) {
    // ai-orchestrator handles NVIDIA→Gemini routing server-side with rate limiting
    return callAIViaEdge('generic', { system: systemPrompt, user: userMessage }, maxTokens);
  }
  // Direct path: Gemini only (NVIDIA requires edge function — see AI_EDGE_FUNCTION_SPEC.md)
  return callGemini(systemPrompt, userMessage, maxTokens);
}

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
export async function askDoubtBuster(question) {
  const system = `You are a senior medical educator specialising in NEET-PG exam preparation.
For the given doubt/question, provide a thorough explanation:
- Core concept explanation
- Clinical relevance
- Memory tips or mnemonics if applicable
- Common exam traps to avoid
Use bullet points. Keep under 300 words.`;
  return callAI(system, question, 600);
}

// ── 8. Generate a 3-question reading comprehension quiz ───────────────────────
// Returns { questions: [{q, options:[{k,v}], answer, explanation}], error }
export async function generateReadingQuiz(bookTitle, subject) {
  const system = `You are a NEET-PG medical exam question setter.
Generate exactly 3 multiple-choice questions to test understanding of a medical e-book.
Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{"questions":[{"q":"question text","options":[{"k":"A","v":"option"},{"k":"B","v":"option"},{"k":"C","v":"option"},{"k":"D","v":"option"}],"answer":"A","explanation":"brief explanation under 60 words"}]}`;
  const msg = `Book title: ${bookTitle}\nSubject: ${subject || 'General Medicine'}\nGenerate 3 NEET-PG MCQs to test mastery of this book.`;
  const { text, error } = await callAI(system, msg, 800);
  if (error) return { questions: null, error };
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed.questions)) throw new Error('Invalid structure');
    return { questions: parsed.questions, error: null };
  } catch (_) {
    return { questions: null, error: 'Could not parse quiz. Please try again.' };
  }
}

// ── 9. Generate a smart note + mnemonic from selected text ────────────────────
// Returns { note, mnemonic, tags[], error }
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
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return { note: parsed.note || '', mnemonic: parsed.mnemonic || '', tags: parsed.tags || [], error: null };
  } catch (_) {
    return { note: null, mnemonic: null, tags: [], error: 'Could not parse response.' };
  }
}

// ── 11. Generate a contextual study plan from clinical logs + persona ─────────
// Returns { plan: [{day, tasks:[{subject,activity,duration_mins}]}], error }
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
    const clean = text.replace(/```json|```/g, '').trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found');
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed.plan)) throw new Error('Invalid plan structure');
    return { plan: parsed.plan, error: null };
  } catch (_) {
    return { plan: null, error: 'Could not parse study plan. Please try again.' };
  }
}

// ── 12. Assess study fatigue level from activity patterns ─────────────────────
// Returns { level: 'low'|'medium'|'high', message, tips[], error }
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
    const clean = text.replace(/```json|```/g, '').trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found');
    const parsed = JSON.parse(match[0]);
    return { level: parsed.level || 'medium', message: parsed.message || '', tips: parsed.tips || [], error: null };
  } catch (_) {
    return { level: 'medium', message: 'Unable to assess — keep studying consistently.', tips: [], error: null };
  }
}

// ── 13. Generate active recall audio script for a topic ───────────────────────
// Returns { script, keywords[], error }
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
    const clean = text.replace(/```json|```/g, '').trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found');
    const parsed = JSON.parse(match[0]);
    return { script: parsed.script || '', keywords: parsed.keywords || [], error: null };
  } catch (_) {
    return { script: null, keywords: [], error: 'Could not generate recall script.' };
  }
}

// ── 14. Generate spaced repetition flashcards from wrong MCQ answers ──────────
// Returns { cards:[{front,back,subject,difficulty}], error }
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
    const clean = text.replace(/```json|```/g, '').trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found');
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed.cards)) throw new Error('Invalid structure');
    return { cards: parsed.cards, error: null };
  } catch (_) {
    return { cards: null, error: 'Could not parse flashcards.' };
  }
}

// ── 15. Grade a subjective / open-ended answer ────────────────────────────────
// Returns { score, maxScore, feedback, suggestions[], error }
export async function gradeSubjectiveAnswer(question, studentAnswer, rubric) {
  const system = `You are a NEET-PG examiner grading a short-answer response.
Assess the answer against the rubric and respond ONLY with valid JSON:
{"score":7,"maxScore":10,"feedback":"one concise sentence (max 80 chars)","suggestions":["improvement 1","improvement 2"]}`;
  const msg = `Question: ${question}\n\nRubric: ${rubric || 'Accuracy, completeness, clinical relevance (10 points)'}\n\nStudent answer:\n${studentAnswer.slice(0, 800)}`;
  const { text, error } = await callAI(system, msg, 400);
  if (error) return { score: null, maxScore: 10, feedback: null, suggestions: [], error };
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found');
    const parsed = JSON.parse(match[0]);
    return { score: parsed.score ?? null, maxScore: parsed.maxScore ?? 10, feedback: parsed.feedback || '', suggestions: parsed.suggestions || [], error: null };
  } catch (_) {
    return { score: null, maxScore: 10, feedback: 'Could not grade answer.', suggestions: [], error: null };
  }
}

// ── 10. Personalised "For You" suggestions on login ──────────────────────────
// Returns { suggestions: [{icon, title, reason, tag, action}], error }
// action is one of: 'ebooks' | 'exam' | 'learn' | 'arena-student' | 'calendar' | 'case-sim'
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
    const clean = text.replace(/```json|```/g, '').trim();
    // Find JSON array even if there's extra text
    const match = clean.match(/\[[\s\S]*?\]/);
    if (!match) throw new Error('No JSON array found');
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Empty or invalid array');
    return { suggestions: parsed.slice(0, 4), error: null };
  } catch (_) {
    return { suggestions: null, error: 'Could not parse suggestions.' };
  }
}
