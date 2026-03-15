import clsx from 'clsx';

export function Skeleton({ className = '', width, height, rounded = 'rounded-md', ...props }) {
  return (
    <div
      className={clsx('skeleton-shimmer', rounded, className)}
      style={{ width, height, ...props.style }}
      {...props}
    />
  );
}

export function SkeletonCard({ lines = 3, hasImage = false }) {
  return (
    <div className="skeleton-card">
      {hasImage && <Skeleton className="skeleton-image" height="120px" rounded="rounded-t-xl" />}
      <div className="skeleton-body">
        <Skeleton width="60%" height="14px" rounded="rounded" />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            width={i === lines - 1 ? '40%' : '100%'}
            height="10px"
            rounded="rounded"
            style={{ marginTop: 8 }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="skeleton-stat">
      <Skeleton width="28px" height="28px" rounded="rounded-lg" />
      <Skeleton width="50%" height="22px" rounded="rounded" style={{ marginTop: 10 }} />
      <Skeleton width="70%" height="10px" rounded="rounded" style={{ marginTop: 6 }} />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="skeleton-row">
      <Skeleton width="32px" height="32px" rounded="rounded-full" />
      <div style={{ flex: 1 }}>
        <Skeleton width="70%" height="12px" rounded="rounded" />
        <Skeleton width="40%" height="10px" rounded="rounded" style={{ marginTop: 6 }} />
      </div>
    </div>
  );
}
