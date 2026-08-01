export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded-xl ${className}`} />;
}

export function OfferCardSkeleton() {
  return (
    <div className="bg-card rounded-3xl border border-border overflow-hidden">
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-4/5" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

export function OrderCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 flex gap-3">
      <Skeleton className="h-20 w-20 rounded-xl" />
      <div className="flex-1 space-y-2 py-1">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

export function PromoBannerSkeleton() {
  return (
    <section className="mx-auto max-w-6xl px-4 mt-4 sm:mt-5">
      <Skeleton className="min-h-[200px] sm:min-h-[280px] w-full rounded-3xl" />
    </section>
  );
}

/** Matches the homepage geometry so the real content swaps in without a jump. */
export function HomeSkeleton() {
  return (
    <div className="space-y-4">
      <PromoBannerSkeleton />
      <section className="mx-auto max-w-6xl px-4 space-y-3">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-2 gap-3">
          <OfferCardSkeleton />
          <OfferCardSkeleton />
          <OfferCardSkeleton />
          <OfferCardSkeleton />
        </div>
      </section>
    </div>
  );
}

