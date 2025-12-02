import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

/**
 * Shimmer effect skeleton component
 */
function Shimmer({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-white/[0.04] rounded-lg",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-shimmer before:bg-gradient-to-r",
        "before:from-transparent before:via-white/[0.08] before:to-transparent",
        className
      )}
    />
  );
}

/**
 * Skeleton for stat cards
 */
export function StatCardSkeleton() {
  return (
    <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
      <div className="flex items-start justify-between">
        <Shimmer className="h-11 w-11 rounded-xl" />
        <Shimmer className="h-6 w-16 rounded-full" />
      </div>
      <div className="mt-4 space-y-2">
        <Shimmer className="h-4 w-24" />
        <Shimmer className="h-8 w-20" />
        <Shimmer className="h-3 w-32" />
      </div>
      <Shimmer className="mt-4 h-8 w-full" />
    </div>
  );
}

/**
 * Skeleton for chart cards
 */
export function ChartCardSkeleton({ height = "h-80" }: { height?: string }) {
  return (
    <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shimmer className="h-6 w-1 rounded-full" />
          <Shimmer className="h-6 w-32" />
        </div>
        <Shimmer className="h-8 w-24 rounded-xl" />
      </div>
      <Shimmer className={cn(height, "w-full rounded-xl")} />
    </div>
  );
}

/**
 * Skeleton for calendar card
 */
export function CalendarCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
      <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <Shimmer className="h-6 w-1 rounded-full" />
          <Shimmer className="h-6 w-48" />
        </div>
        <Shimmer className="h-9 w-20 rounded-lg" />
      </div>
      <div className="p-4">
        <Shimmer className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Skeleton for quick actions
 */
export function QuickActionsSkeleton() {
  return (
    <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
      <div className="flex items-center gap-3 mb-6">
        <Shimmer className="h-6 w-1 rounded-full" />
        <Shimmer className="h-6 w-28" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Shimmer key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for horizontal bars
 */
export function HorizontalBarsSkeleton() {
  return (
    <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
      <div className="flex items-center gap-3 mb-6">
        <Shimmer className="h-6 w-1 rounded-full" />
        <Shimmer className="h-6 w-36" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <Shimmer className="h-4 w-32" />
              <Shimmer className="h-4 w-16" />
            </div>
            <Shimmer className="h-3 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Full dashboard skeleton
 */
export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <Shimmer className="h-8 w-48" />
          <Shimmer className="h-4 w-64" />
        </div>
        <Shimmer className="h-10 w-64 rounded-xl" />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Calendar + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CalendarCardSkeleton />
        <ChartCardSkeleton />
      </div>

      {/* Bar chart */}
      <ChartCardSkeleton height="h-96" />

      {/* Trend + Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>

      {/* Popularity + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <div className="lg:col-span-7">
          <HorizontalBarsSkeleton />
        </div>
        <div className="lg:col-span-3">
          <QuickActionsSkeleton />
        </div>
      </div>
    </div>
  );
}

export default DashboardSkeleton;

