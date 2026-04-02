export default function PageTransition({ pageKey, children }) {
  return (
    <div key={pageKey} className="page-enter" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  );
}
