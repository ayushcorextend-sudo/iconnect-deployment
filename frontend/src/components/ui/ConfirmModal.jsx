/**
 * ConfirmModal — drop-in replacement for confirm()
 *
 * Usage:
 *   const [pending, setPending] = useState(null);
 *   // to trigger: setPending({ message: '…', onConfirm: () => doDelete() })
 *   // in JSX: {pending && <ConfirmModal {...pending} onCancel={() => setPending(null)} />}
 */
export default function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = 'Delete', danger = true }) {
  return (
    <div
      className="overlay"
      onClick={onCancel}
      style={{ zIndex: 600 }}
    >
      <div
        className="modal"
        style={{ maxWidth: 380 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="mh">
          <div className="mt">{danger ? '⚠️ Confirm' : '🔔 Confirm'}</div>
          <button className="mc" onClick={onCancel}>×</button>
        </div>
        <div className="mb">
          <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, margin: 0 }}>{message}</p>
        </div>
        <div className="mf">
          <button
            className="btn btn-sm"
            onClick={onConfirm}
            style={{
              background: danger ? 'linear-gradient(135deg,#EF4444,#DC2626)' : 'linear-gradient(135deg,#3B82F6,#2563EB)',
              color: '#fff', border: 'none',
            }}
          >
            {confirmLabel}
          </button>
          <button className="btn btn-s btn-sm" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
