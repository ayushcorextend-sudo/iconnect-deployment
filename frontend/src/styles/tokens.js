// Design tokens for inline-style usage — mirrors tailwind.config.js colors
// Usage: import { C } from '../styles/tokens';  then: style={{ color: C.primary }}

export const C = {
  // Brand
  primary:       '#4F46E5',
  primaryDark:   '#3730A3',
  primaryLight:  '#818CF8',
  primaryBg:     '#EEF2FF',

  // Accent / amber
  accent:        '#F59E0B',
  accentDark:    '#D97706',
  accentLight:   '#FEF3C7',

  // Semantic
  success:       '#10B981',
  successDark:   '#15803D',
  successLight:  '#DCFCE7',

  danger:        '#EF4444',
  dangerDark:    '#DC2626',
  dangerLight:   '#FEE2E2',

  warn:          '#F59E0B',
  warnDark:      '#D97706',
  warnLight:     '#FFFBEB',

  info:          '#3B82F6',
  infoDark:      '#2563EB',
  infoLight:     '#EFF6FF',

  // Neutral
  text:          '#111827',
  textSecondary: '#6B7280',
  textTertiary:  '#9CA3AF',
  border:        '#E5E7EB',
  borderLight:   '#F3F4F6',
  surface:       '#F8FAFC',
  surfaceAlt:    '#F3F4F6',
  white:         '#FFFFFF',

  // Sidebar / dark
  sidebar:       '#0F172A',
  dark:          '#1E1B4B',
};
