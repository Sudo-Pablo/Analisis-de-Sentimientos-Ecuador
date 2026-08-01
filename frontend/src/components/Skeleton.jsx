const Skeleton = ({ className = '', variant = 'rect' }) => {
  const base = 'shimmer-bg rounded-lg animate-pulse'
  const variants = {
    rect: base,
    circle: `${base} rounded-full`,
    text: `${base} h-4 rounded`,
  }

  return <div className={`${variants[variant] || variants.rect} ${className}`} aria-hidden="true" />
}

export const StatCardSkeleton = () => (
  <div className="card-base p-5 lg:p-6 space-y-3">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="h-8 w-20" />
    <Skeleton className="h-3 w-16" />
  </div>
)

export const ChartSkeleton = ({ height = 300 }) => (
  <div className="card-base p-5 lg:p-6">
    <Skeleton className="h-5 w-48 mb-4" />
    <Skeleton className="w-full rounded-xl" style={{ height }} />
  </div>
)

export default Skeleton
