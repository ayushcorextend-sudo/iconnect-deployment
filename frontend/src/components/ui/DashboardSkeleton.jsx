/**
 * DashboardSkeleton — premium perceived-performance loader shown while
 * the dashboard data fetches. Matches the visual footprint of the real
 * dashboard so there's no layout shift on data arrival.
 *
 * Used by DoctorDashboard, CADashboard, SADashboard first-load states.
 */
export default function DashboardSkeleton({ variant = 'doctor' }) {
  return (
    <div className="page">
      <div className="dashboard-skeleton" aria-busy="true" aria-live="polite">
        <div className="dashboard-skeleton-hero" />
        <div className="dashboard-skeleton-grid">
          <div className="dashboard-skeleton-card" />
          <div className="dashboard-skeleton-card" />
          <div className="dashboard-skeleton-card" />
          <div className="dashboard-skeleton-card" />
        </div>
        <div className="dashboard-skeleton-wide" />
        <div className="dashboard-skeleton-wide" />
        {variant === 'doctor' && <div className="dashboard-skeleton-wide" />}
        <span className="sr-only">Loading your dashboard…</span>
      </div>
    </div>
  );
}
