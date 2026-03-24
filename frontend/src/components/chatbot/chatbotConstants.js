import React from 'react';
import { Sparkles, Brain, MessageCircle } from 'lucide-react';

export const RATE_LIMIT = 20;
export const RL_KEY = 'iconnect_chatbot_usage';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const SYSTEM_PROMPT = `You are iConnect Assistant, a helpful AI powered by Google Gemini, embedded in the iConnect medical education platform for PG medical aspirants in India (NEET-PG / AIIMS PG).

Your role:
- Answer questions about medical topics relevant to PG exam preparation (NEET-PG, AIIMS, DNB)
- Help users understand clinical concepts, pharmacology, pathology, surgery, and other PG-relevant subjects
- Provide study tips and exam strategies for Indian PG medical entrance exams
- Assist with understanding e-books, activity scores, and platform features

Keep responses concise (under 300 words unless asked for detail). Use bullet points for lists. Always include a disclaimer for clinical queries that real patient care requires consultation with a qualified physician.`;

export const QUICK_ACTIONS = [
  { icon: React.createElement(Sparkles, { size: 13 }), label: 'Suggest topics', prompt: 'Suggest important topics I should study for NEET-PG based on my specialization.' },
  { icon: React.createElement(Brain, { size: 13 }), label: 'What should I read next?', prompt: 'What should I read next to improve my exam preparation?' },
  { icon: React.createElement(MessageCircle, { size: 13 }), label: 'Review my research activity', prompt: 'Give me tips on how to make the most of my research and reading activity on iConnect.' },
  { icon: React.createElement(Brain, { size: 13 }), label: 'Organize my notes', prompt: 'How should I organize my notes and highlights for effective revision?' },
];

export function getRateLimitData() {
  try {
    const raw = localStorage.getItem(RL_KEY);
    if (!raw) return { date: '', count: 0 };
    return JSON.parse(raw);
  } catch (_) {
    return { date: '', count: 0 };
  }
}

export function checkAndIncrementRateLimit() {
  const today = new Date().toISOString().split('T')[0];
  const data = getRateLimitData();
  if (data.date !== today) {
    localStorage.setItem(RL_KEY, JSON.stringify({ date: today, count: 1 }));
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }
  if (data.count >= RATE_LIMIT) return { allowed: false, remaining: 0 };
  const newCount = data.count + 1;
  localStorage.setItem(RL_KEY, JSON.stringify({ date: today, count: newCount }));
  return { allowed: true, remaining: RATE_LIMIT - newCount };
}
