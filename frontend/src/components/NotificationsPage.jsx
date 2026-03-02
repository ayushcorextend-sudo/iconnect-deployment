import { useState } from 'react';
import Toggle from './Toggle';

export default function NotificationsPage({ notifications, setNotifications, addToast }) {
  const [channels, setChannels] = useState({ in_app: true, email: true, whatsapp: false, sms: false });
  const [tab, setTab] = useState('all');

  const markAll = () => setNotifications(n => n.map(x => ({ ...x, unread: false })));
  const markOne = id => setNotifications(n => n.map(x => x.id === id ? { ...x, unread: false } : x));
  const send = () => {
    setNotifications(n => [{
      id: Date.now(), type: 'success', icon: '💬', title: 'Test Notification Sent',
      body: 'This is a test alert from Admin Yokesh. All channels are working correctly.',
      time: 'Just now', unread: true, channel: 'in_app',
    }, ...n]);
    addToast('success', 'Test notification sent!');
  };

  const filtered = tab === 'all' ? notifications : notifications.filter(n => n.unread);
  const bg = { info: '#EFF6FF', success: '#EFF6FF', warn: '#FFFBEB', error: '#FEF2F2' };

  return (
    <div className="page">
      <div className="ph-row ph">
        <div>
          <div className="pt">🔔 Notifications</div>
          <div className="ps">{notifications.filter(n => n.unread).length} unread</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-s btn-sm" onClick={send}>📤 Send Test</button>
          <button className="btn btn-s btn-sm" onClick={markAll}>✓ Mark all read</button>
        </div>
      </div>

      <div className="grid2" style={{ alignItems: 'start' }}>
        <div>
          <div className="tabs">
            <button className={`tab ${tab === 'all' ? 'act' : ''}`} onClick={() => setTab('all')}>All</button>
            <button className={`tab ${tab === 'unread' ? 'act' : ''}`} onClick={() => setTab('unread')}>
              Unread ({notifications.filter(n => n.unread).length})
            </button>
          </div>
          {filtered.length === 0
            ? <div className="empty"><div className="empty-ic">🔕</div><div className="empty-t">All clear!</div></div>
            : filtered.map(n => (
              <div key={n.id} className={`ni ${n.unread ? 'unr' : ''}`} onClick={() => markOne(n.id)}>
                <div className="ni-ic" style={{ background: bg[n.type] || '#F9FAFB' }}>{n.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div className="ni-t">{n.title}</div>
                    {n.unread && <span className="bdg bg-g" style={{ fontSize: 9 }}>NEW</span>}
                  </div>
                  <div className="ni-b">{n.body}</div>
                  <div className="ni-time">{n.time} · via {n.channel}</div>
                </div>
              </div>
            ))
          }
        </div>

        <div>
          <div className="card">
            <div className="ct" style={{ marginBottom: 14 }}>🔔 Notification Channels</div>
            {[
              ['📱', 'In-App Notifications', 'Real-time alerts inside iConnect', 'in_app'],
              ['📧', 'Email Digest', 'Daily summary to your registered email', 'email'],
              ['💬', 'WhatsApp Alerts', 'Important updates via WhatsApp', 'whatsapp'],
              ['📲', 'SMS Alerts', 'Critical alerts via SMS', 'sms'],
            ].map(([ic, l, d, k]) => (
              <div key={k} className="ch-toggle">
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 20 }}>{ic}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{l}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>{d}</div>
                  </div>
                </div>
                <Toggle on={channels[k]} onChange={() => setChannels(c => ({ ...c, [k]: !c[k] }))} />
              </div>
            ))}
          </div>

          <div className="card mt4">
            <div className="ct" style={{ marginBottom: 12 }}>⚡ Alert Triggers</div>
            {[
              ['New e-book approved', true], ['Webinar reminders', true], ['Quiz available', true],
              ['Admin messages', true], ['Leaderboard changes', false], ['Study group invites', false],
            ].map(([l, on], i) => (
              <div key={i} className="ch-toggle">
                <span style={{ fontSize: 13 }}>{l}</span>
                <Toggle on={on} onChange={() => {}} />
              </div>
            ))}
          </div>

          <div className="card mt4" style={{ background: '#EFF6FF', border: '1.5px solid rgba(37,99,235,.2)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 30 }}>🤝</span>
              <div>
                <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 14, color: '#1D4ED8' }}>Welcome from Admin Yokesh</div>
                <div style={{ fontSize: 12, color: '#1D4ED8', opacity: 0.8, marginTop: 4, lineHeight: 1.5 }}>
                  &quot;Welcome to iConnect! This platform is built for PG aspirants like you. Explore e-books, track your progress, and connect with peers. We&apos;re here to support your journey.&quot;
                </div>
                <div style={{ fontSize: 11, color: '#1D4ED8', opacity: 0.6, marginTop: 6 }}>— Yokesh, Platform Admin · Acknowledged ✅</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
