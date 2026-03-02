import { useState } from 'react';
import Toggle from './Toggle';

export default function SettingsPage({ addToast }) {
  const [toggles, setT] = useState({ autoApprove: false, welcomeMsg: true, digestEmail: true, leaderboardUpdates: false, reqVerify: true });
  const tog = k => setT(p => ({ ...p, [k]: !p[k] }));

  const sections = [
    {
      sec: 'Content Settings',
      items: [['auto_approve', 'Auto-approve from trusted admins', 'autoApprove'], ['file_size', 'Max PDF size (MB)', null, 100], ['access_years', 'Access duration (years)', null, 2]],
    },
    {
      sec: 'Notification Settings',
      items: [['welcome', 'Welcome message on registration', 'welcomeMsg'], ['digest', 'Daily email digest', 'digestEmail'], ['lb', 'Leaderboard update alerts', 'leaderboardUpdates']],
    },
    {
      sec: 'Registration & Verification',
      items: [['req_verify', 'Require admin approval for verification', 'reqVerify'], ['hometown', 'Mandate hometown & home state', null, true], ['access_2yr', 'Enforce 2-year access policy', null, true]],
    },
  ];

  return (
    <div className="page">
      <div className="ph">
        <div className="pt">⚙️ Settings</div>
        <div className="ps">Platform configuration and preferences</div>
      </div>
      <div style={{ maxWidth: 640 }}>
        {sections.map(({ sec, items }) => (
          <div key={sec} className="card" style={{ marginBottom: 16 }}>
            <div className="ct" style={{ marginBottom: 14 }}>{sec}</div>
            {items.map(([k, l, togKey, val]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F9FAFB' }}>
                <span style={{ fontSize: 13 }}>{l}</span>
                {togKey
                  ? <Toggle on={toggles[togKey]} onChange={() => tog(togKey)} />
                  : <input className="fi-in" style={{ width: 80 }} defaultValue={val} />
                }
              </div>
            ))}
          </div>
        ))}
        <button className="btn btn-p" onClick={() => addToast('success', 'Settings saved!')}>💾 Save Settings</button>
      </div>
    </div>
  );
}
