-- ============================================================
-- Migration: Phase 4 — Add missing columns to existing tables
-- calendar_diary: study_hours, goals_met
-- clinical_logs: difficulty
-- ============================================================

-- calendar_diary: add study tracking columns used by DiaryPanel.jsx
ALTER TABLE calendar_diary ADD COLUMN IF NOT EXISTS study_hours NUMERIC DEFAULT 0;
ALTER TABLE calendar_diary ADD COLUMN IF NOT EXISTS goals_met BOOLEAN DEFAULT false;

-- clinical_logs: add difficulty column used by ClinicalLogger.jsx
ALTER TABLE clinical_logs ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';
