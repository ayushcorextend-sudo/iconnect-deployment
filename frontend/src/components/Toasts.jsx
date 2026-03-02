export default function Toasts({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type[0]}`}>
          <span>
            {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : t.type === 'warn' ? '⚠️' : 'ℹ️'}
          </span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
