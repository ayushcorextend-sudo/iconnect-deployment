/**
 * aiService.js — Centralised Gemini AI service layer for iConnect
 *
 * All functions call the gemini-proxy Supabase edge function.
 * Each function returns { text, error } — never throws.
 */

const SUPABASE_URL = 'https://kzxsyeznpudomeqxbnvp.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6eHN5ZXpucHVkb21lcXhibnZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMjQ1NjEsImV4cCI6MjA4NzkwMDU2MX0.4w2UkRl3rxq2WOiQDmY4aMPGUhQ_5V4W8hridmGmy9o';

async function callGemini(systemPrompt, userMessage, maxTokens = 512) {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/gemini-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
        maxOutputTokens: maxTokens,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { text: null, error: err.error || `API error ${res.status}` };
    }
    const data = await res.json();
    return { text: data.text || '', error: null };
  } catch (e) {
    return { text: null, error: e.message || 'Network error' };
  }
}

// ── 1. Explain a NEET-PG MCQ question ─────────────────────────────────────
export async function explainQuestion(question, options, correctKey, existingExplanation) {
  const system = `You are a NEET-PG medical education expert. Explain MCQ answers concisely for PG aspirants.
Format: 2-3 sentences on WHY the correct answer is right, and briefly why the others are wrong. Keep it under 150 words.`;
  const optText = options.map(o => `${o.k}. ${o.v}`).join('\n');
  const msg = `Question: ${question}\n\nOptions:\n${optText}\n\nCorrect Answer: ${correctKey}${existingExplanation ? `\n\nHint: ${existingExplanation}` : ''}`;
  return callGemini(system, msg, 256);
}

// ── 2. Generate a personalised study plan ─────────────────────────────────
export async function generateStudyPlan(speciality, booksRead, quizScore, totalScore) {
  const system = `You are a NEET-PG study advisor. Create a brief, actionable 7-day study plan for a PG aspirant.
Use bullet points. Keep it under 200 words. Focus on high-yield topics for Indian PG exams.`;
  const msg = `Speciality: ${speciality || 'General Medicine'}
Books read this month: ${booksRead || 0}
Quiz score: ${quizScore || 0} pts / Total score: ${totalScore || 0} pts
Please generate a personalised 7-day study plan to improve weak areas.`;
  return callGemini(system, msg, 400);
}

// ── 3. Generate a clinical case simulation ────────────────────────────────
export async function getClinicalCase(speciality) {
  const system = `You are a clinical case generator for NEET-PG exam preparation.
Generate a short clinical vignette with:
1. Case presentation (3-4 sentences)
2. Three MCQ options for diagnosis/management
3. The correct answer with brief explanation
Format clearly with emojis. Keep under 250 words.`;
  const msg = `Generate a NEET-PG style clinical case for: ${speciality || 'Internal Medicine'}`;
  return callGemini(system, msg, 512);
}

// ── 4. AI content audit for uploaded e-books ─────────────────────────────
export async function auditContent(title, subject, description) {
  const system = `You are a medical content quality reviewer for a PG education platform.
Review the given content metadata and provide:
1. Quality score (1-10)
2. Target audience (MD/MS/DM/MCh level)
3. 2-3 improvement suggestions
4. Any content safety concerns
Keep it under 150 words. Be direct and helpful.`;
  const msg = `Title: ${title}\nSubject: ${subject || 'Unknown'}\nDescription: ${description || 'No description provided'}`;
  return callGemini(system, msg, 300);
}

// ── 5. Predictive engagement alerts for super admins ─────────────────────
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
  return callGemini(system, msg, 400);
}

// ── 6. Knowledge gap analysis ─────────────────────────────────────────────
export async function analyzeKnowledgeGap(subjectScores) {
  const system = `You are a NEET-PG learning analytics expert.
Identify knowledge gaps from quiz performance data and suggest targeted interventions.
Format: 3-4 bullet points. Under 150 words.`;
  const subjectList = subjectScores
    .map(s => `${s.subject}: ${s.avgScore}% (${s.attempts} attempts)`)
    .join('\n');
  const msg = `Subject performance breakdown:\n${subjectList || 'No data yet'}\n\nIdentify top knowledge gaps and suggest study priorities.`;
  return callGemini(system, msg, 300);
}

// ── 7. Doubt Buster — deep-dive answer for specific medical questions ─────
export async function askDoubtBuster(question) {
  const system = `You are a senior medical educator specialising in NEET-PG exam preparation.
For the given doubt/question, provide a thorough explanation:
- Core concept explanation
- Clinical relevance
- Memory tips or mnemonics if applicable
- Common exam traps to avoid
Use bullet points. Keep under 300 words.`;
  return callGemini(system, question, 600);
}

// ── 8. Generate a 3-question reading comprehension quiz ───────────────────
// Returns { questions: [{q, options:[{k,v}], answer, explanation}], error }
export async function generateReadingQuiz(bookTitle, subject) {
  const system = `You are a NEET-PG medical exam question setter.
Generate exactly 3 multiple-choice questions to test understanding of a medical e-book.
Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{"questions":[{"q":"question text","options":[{"k":"A","v":"option"},{"k":"B","v":"option"},{"k":"C","v":"option"},{"k":"D","v":"option"}],"answer":"A","explanation":"brief explanation under 60 words"}]}`;
  const msg = `Book title: ${bookTitle}\nSubject: ${subject || 'General Medicine'}\nGenerate 3 NEET-PG MCQs to test mastery of this book.`;
  const { text, error } = await callGemini(system, msg, 800);
  if (error) return { questions: null, error };
  try {
    // Strip markdown code fences if present
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed.questions)) throw new Error('Invalid structure');
    return { questions: parsed.questions, error: null };
  } catch (_) {
    return { questions: null, error: 'Could not parse quiz. Please try again.' };
  }
}

// ── 9. Generate a smart note + mnemonic from selected text ────────────────
// Returns { note, mnemonic, tags[], error }
export async function generateSmartNote(originalText, subject) {
  const system = `You are a NEET-PG study coach. Compress the given medical text into:
1. A concise study note (max 80 words, bullet points)
2. A memorable mnemonic or memory tip
3. Up to 4 relevant topic tags (single words or short phrases)
Respond ONLY with valid JSON (no markdown):
{"note":"...","mnemonic":"...","tags":["tag1","tag2"]}`;
  const msg = `Subject: ${subject || 'Medicine'}\n\nText to compress:\n${originalText.slice(0, 1500)}`;
  const { text, error } = await callGemini(system, msg, 400);
  if (error) return { note: null, mnemonic: null, tags: [], error };
  try {
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return { note: parsed.note || '', mnemonic: parsed.mnemonic || '', tags: parsed.tags || [], error: null };
  } catch (_) {
    return { note: null, mnemonic: null, tags: [], error: 'Could not parse response.' };
  }
}
