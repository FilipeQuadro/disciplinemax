"use client";

interface SkeletonBaseProps {
  className?: string;
}

export function SkeletonCard({ className = "" }: SkeletonBaseProps) {
  return (
    <div className={`rounded-2xl p-5 animate-pulse ${className}`}
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="h-4 w-3/4 rounded bg-white/[0.04] mb-3" />
      <div className="h-3 w-1/2 rounded bg-white/[0.03] mb-2" />
      <div className="h-3 w-2/3 rounded bg-white/[0.03]" />
    </div>
  );
}

export function SkeletonList({ count = 5, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl p-4"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 rounded bg-white/[0.04]" />
              <div className="h-2 w-1/2 rounded bg-white/[0.03]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${Math.min(count, 4)} gap-3 animate-pulse ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="h-2 w-12 rounded bg-white/[0.04]" />
            <div className="w-8 h-8 rounded-lg bg-white/[0.04]" />
          </div>
          <div className="h-6 w-16 rounded bg-white/[0.05] mb-1" />
          <div className="h-2 w-10 rounded bg-white/[0.03]" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonFeed({ count = 5, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card flex items-start gap-3 p-4">
          <div className="w-10 h-10 rounded-xl bg-white/[0.04] shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-3 w-24 rounded bg-white/[0.04]" />
              <div className="h-2 w-16 rounded bg-white/[0.03]" />
            </div>
            <div className="h-3 w-full rounded bg-white/[0.03]" />
          </div>
          <div className="h-5 w-14 rounded-lg bg-white/[0.03] shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonProfile({ className = "" }: SkeletonBaseProps) {
  return (
    <div className={`space-y-6 animate-pulse ${className}`}>
      <div className="flex items-center gap-3">
        <div className="h-8 w-48 rounded bg-white/[0.04]" />
      </div>
      <div className="rounded-2xl p-6"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-xl bg-white/[0.04]" />
          <div className="space-y-2">
            <div className="h-5 w-32 rounded bg-white/[0.04]" />
            <div className="h-3 w-20 rounded bg-white/[0.03]" />
          </div>
        </div>
        <div className="h-2 w-full rounded bg-white/[0.04]" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="h-2 w-12 rounded bg-white/[0.04] mb-3" />
            <div className="h-6 w-10 rounded bg-white/[0.05] mb-1" />
            <div className="h-2 w-16 rounded bg-white/[0.03]" />
          </div>
        ))}
      </div>
    </div>
  );
}