// Sample clinical cases for Study Plan development
export const mockClinicalLogs = [
  {
    id: 'mock-cl-1',
    case_title: '45-year-old male with acute STEMI',
    speciality: 'Cardiology',
    key_learnings: 'STEMI management: Dual antiplatelet (aspirin + clopidogrel/ticagrelor), primary PCI within 90 minutes if possible. Thrombolysis if PCI not available within 120 minutes. Post-MI: ACE inhibitor, beta-blocker, statin. Watch for complications: VF (first 24h), cardiogenic shock, mitral regurgitation.',
    difficulty: 'hard',
    logged_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-cl-2',
    case_title: '28-year-old female with SLE flare and nephritis',
    speciality: 'Rheumatology',
    key_learnings: 'SLE nephritis WHO/ISN classification (Class I–VI). Class III/IV: cyclophosphamide or mycophenolate mofetil + high-dose corticosteroids. Monitor complement (C3, C4) and anti-dsDNA. Belimumab for refractory cases. Hydroxychloroquine for all SLE patients.',
    difficulty: 'hard',
    logged_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-cl-3',
    case_title: '60-year-old diabetic with acute pancreatitis',
    speciality: 'Gastroenterology',
    key_learnings: 'Ranson criteria for severity assessment. Aggressive IV fluid resuscitation (Lactated Ringer preferred). NPO initially but early enteral feeding (within 24-48h) preferred over TPN. CT severity index (Balthazar). Watch for ARDS, AKI, DIC. Cholecystectomy if gallstone etiology.',
    difficulty: 'medium',
    logged_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
  },
];
