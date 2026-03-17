// ─────────────────────────────────────────────────────────────────
// Mock Data Central Export
// Set USE_MOCKS = false before production deployment.
// All components check this flag before falling back to mock data.
// ─────────────────────────────────────────────────────────────────

// IMPORTANT: Keep this false in production
export const USE_MOCKS = false;

export { defaultSuggestions } from './defaultSuggestions';
export { mockUsers } from './mockUsers';
export { mockExamSets, mockQuestions } from './mockExamData';
export { mockActivityLogs } from './mockActivityLogs';
export { mockClinicalLogs } from './mockClinicalLogs';
