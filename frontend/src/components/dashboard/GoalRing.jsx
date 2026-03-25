import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function GoalRing({ mins, userId }) {
  const STORAGE_KEY = userId ? `weekly_target_${userId}` : 'weekly_target_mins';
  const [targetMins, setTargetMins] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : 300;
  });
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(Math.round(targetMins / 60)));

  // Load target from DB on mount (DB wins over localStorage)
  useEffect(() => {
    if (!userId) return;
    supabase.from('user_study_persona')
      .select('weekly_target_mins')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.weekly_target_mins) {
          setTargetMins(data.weekly_target_mins);
          setInputVal(String(Math.round(data.weekly_target_mins / 60)));
          localStorage.setItem(STORAGE_KEY, String(data.weekly_target_mins));
        }
      });
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveTarget = () => {
    const hours = parseFloat(inputVal) || 5;
    const clamped = Math.max(0.5, Math.min(24, hours));
    const newMins = Math.round(clamped * 60);
    setTargetMins(newMins);
    localStorage.setItem(STORAGE_KEY, String(newMins));
    setEditing(false);
    if (userId) {
      supabase.from('user_study_persona')
        .upsert({ user_id: userId, weekly_target_mins: newMins }, { onConflict: 'user_id' })
        .then(() => {});
    }
  };

  const r = 38;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(mins / Math.max(targetMins, 1), 1);
  const offset = circ * (1 - pct);
  const hours = Math.floor(mins / 60);
  const m = mins % 60;
  const label = hours > 0 ? `${hours}h${m > 0 ? ` ${m}m` : ''}` : `${mins}m`;
  const color = pct >= 1 ? '#059669' : pct >= 0.6 ? '#D97706' : '#2563EB';

  return (
    <div className="flex flex-col items-center gap-1.5 w-full">
      <div className="w-full max-w-44 aspect-square">
        <svg viewBox="0 0 96 96" width="100%" height="100%">
          <circle cx={48} cy={48} r={r} fill="none" stroke="#F3F4F6" strokeWidth={8} />
          <circle
            cx={48} cy={48} r={r} fill="none" stroke={color} strokeWidth={8}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            transform="rotate(-90 48 48)"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
          <text x={48} y={44} textAnchor="middle" fontSize={13} fontWeight="700" fill={color}>{Math.round(pct * 100)}%</text>
          <text x={48} y={58} textAnchor="middle" fontSize={9} fill="#6B7280">{label || '0m'}</text>
        </svg>
      </div>
      <div className="text-xs font-bold text-gray-700">Weekly Learning Target</div>
      {editing ? (
        <div className="flex items-center gap-1.5 mt-0.5">
          <input
            type="number"
            min="0.5" max="24" step="0.5"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveTarget(); if (e.key === 'Escape') setEditing(false); }}
            autoFocus
            className="w-14 px-2 py-1 rounded-md border-2 border-indigo-600 text-xs font-semibold text-center outline-none bg-white"
          />
          <span className="text-xs text-gray-500">hrs</span>
          <button
            onClick={saveTarget}
            className="bg-indigo-600 text-white border-0 rounded-md px-2.5 py-1 text-xs font-bold cursor-pointer hover:bg-indigo-700 transition-colors"
          >✓</button>
          <button
            onClick={() => setEditing(false)}
            className="bg-gray-100 text-gray-500 border-0 rounded-md px-2 py-1 text-xs cursor-pointer hover:bg-gray-200 transition-colors"
          >✕</button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <div className="text-xs text-gray-400">{Math.round(mins / 60 * 10) / 10}h of {Math.round(targetMins / 60 * 10) / 10}h target</div>
          <button
            onClick={() => { setInputVal(String(Math.round(targetMins / 60))); setEditing(true); }}
            title="Edit weekly target"
            className="bg-transparent border border-gray-200 rounded px-1.5 py-0.5 text-xs text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors"
          >✏ Edit</button>
        </div>
      )}
      {pct >= 1 && !editing && <div className="text-xs text-emerald-600 font-semibold">🎉 Goal achieved!</div>}
    </div>
  );
}
