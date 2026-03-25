import { useState, useEffect } from 'react';
import Toggle from './Toggle';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage({ addToast }) {
  const { user } = useAuth();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [welcomeMsg, setWelcomeMsg] = useState(true);
  const [kahootPin, setKahootPin] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    async function loadPrefs() {
      try {
        const uid = user?.id;
        if (!uid) return;
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', uid).maybeSingle();
        setIsSuperAdmin(profile?.role === 'superadmin');
        const { data } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', uid)
          .maybeSingle();
        if (data) {
          setEmailEnabled(data.email_enabled ?? true);
          setWhatsappEnabled(data.whatsapp_enabled ?? false);
          setSmsEnabled(data.sms_enabled ?? false);
          setWelcomeMsg(data.welcome_msg ?? true);
        }
      } catch (e) { /* silent */ }
    }
    loadPrefs();

    // Load Kahoot PIN
    supabase.from('app_settings').select('value').eq('key', 'kahoot_pin').maybeSingle()
      .then(({ data }) => setKahootPin(data?.value || ''))
      .catch(() => {});
  }, []);

  const savePrefs = async (updated) => {
    try {
      const uid = user?.id;
      if (!uid) return;
      await supabase.from('notification_preferences').upsert({
        user_id: uid,
        ...updated,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } catch (e) { /* silent */ }
  };

  const saveKahootPin = async () => {
    try {
      await supabase.from('app_settings').upsert(
        { key: 'kahoot_pin', value: kahootPin.trim(), updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      addToast('success', 'Kahoot PIN updated!');
    } catch (e) { addToast('error', 'Failed to save PIN'); }
  };

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">⚙️ Settings</div>
        <div className="ps">Notification preferences and platform configuration</div>
      </div>
      <div style={{ maxWidth: 640 }}>

        {/* Notification Channel Preferences */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="ct" style={{ marginBottom: 14 }}>🔔 Notification Channel Preferences</div>
          {[
            ['📧', 'Email Notifications', emailEnabled, (v) => { setEmailEnabled(v); savePrefs({ email_enabled: v, whatsapp_enabled: whatsappEnabled, sms_enabled: smsEnabled, welcome_msg: welcomeMsg }); }],
            ['💬', 'WhatsApp Alerts', whatsappEnabled, (v) => { setWhatsappEnabled(v); savePrefs({ email_enabled: emailEnabled, whatsapp_enabled: v, sms_enabled: smsEnabled, welcome_msg: welcomeMsg }); }],
            ['📲', 'SMS Alerts', smsEnabled, (v) => { setSmsEnabled(v); savePrefs({ email_enabled: emailEnabled, whatsapp_enabled: whatsappEnabled, sms_enabled: v, welcome_msg: welcomeMsg }); }],
            ['🎉', 'Welcome Message for New Users', welcomeMsg, (v) => { setWelcomeMsg(v); savePrefs({ email_enabled: emailEnabled, whatsapp_enabled: whatsappEnabled, sms_enabled: smsEnabled, welcome_msg: v }); }],
          ].map(([ic, l, val, onChange]) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F9FAFB' }}>
              <span style={{ fontSize: 13 }}>{ic} {l}</span>
              <Toggle on={val} onChange={() => onChange(!val)} />
            </div>
          ))}
        </div>

        {/* Kahoot Settings — superadmin only */}
        {isSuperAdmin && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, border: '1px solid #E5E7EB', marginTop: 24 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>🎮 Kahoot Settings</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Active Game PIN</label>
                <input
                  type="text"
                  value={kahootPin}
                  onChange={e => setKahootPin(e.target.value)}
                  placeholder="Enter Kahoot PIN (e.g. 123456)"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #D1D5DB', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <button onClick={saveKahootPin} style={{ background: 'linear-gradient(135deg,#4F46E5,#3730A3)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Save PIN
              </button>
            </div>
            {kahootPin && (
              <div style={{ marginTop: 10, fontSize: 13, color: '#6B7280' }}>
                Current active PIN: <strong style={{ color: '#4F46E5' }}>{kahootPin}</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
