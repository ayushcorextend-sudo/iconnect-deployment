import { useState } from 'react';
import ContentAdminNotificationCenter from './broadcast/ContentAdminNotificationCenter';
import EngageLanding from './broadcast/EngageLanding';
import DoctorEngageView from './broadcast/DoctorEngageView';
import ContentAdminEngageView from './broadcast/ContentAdminEngageView';

// Re-export SAMessageBox so existing imports from BroadcastPage still work
export { SAMessageBox } from './broadcast/SAMessageBox';

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function BroadcastPage({ role, userId, darkMode, addToast }) {

  // Gate: Content Admin → their own notification center
  if (role === 'contentadmin') {
    return <ContentAdminNotificationCenter userId={userId} addToast={addToast} darkMode={darkMode} />;
  }

  // Gate: Not superadmin → access denied
  if (role !== 'superadmin') {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#9CA3AF' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Access Restricted</div>
        <div style={{ fontSize: 13, marginTop: 4 }}>Only Super Admins can access the Engage Engine.</div>
      </div>
    );
  }

  // Superadmin view — which sub-view to show
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [engageView, setEngageView] = useState(null); // null | 'doctors' | 'contentadmins'

  if (engageView === null) {
    return (
      <EngageLanding
        darkMode={darkMode}
        onSelectDoctors={() => setEngageView('doctors')}
        onSelectCAs={() => setEngageView('contentadmins')}
      />
    );
  }

  if (engageView === 'contentadmins') {
    return (
      <ContentAdminEngageView
        userId={userId}
        addToast={addToast}
        darkMode={darkMode}
        onBack={() => setEngageView(null)}
      />
    );
  }

  return (
    <DoctorEngageView
      userId={userId}
      addToast={addToast}
      darkMode={darkMode}
      onBack={() => setEngageView(null)}
    />
  );
}
