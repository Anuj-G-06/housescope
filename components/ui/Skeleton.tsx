"use client";

function ShimmerBar({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-[#EDE8E1] rounded-lg relative overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 animate-[shimmer_1.4s_ease-in-out_infinite]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
          transform: "translateX(-100%)",
        }}
      />
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

export function FindingCardSkeleton() {
  return (
    <div className="bg-white border border-[#E8E0D5] rounded-2xl p-5 flex gap-3">
      <ShimmerBar className="w-1 h-20 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-3">
        <ShimmerBar className="h-3 w-24" />
        <ShimmerBar className="h-4 w-48" />
        <ShimmerBar className="h-3 w-full" />
        <ShimmerBar className="h-3 w-32" />
      </div>
    </div>
  );
}

export function VideoPlayerSkeleton() {
  return (
    <div className="w-full aspect-video bg-[#EDE8E1] rounded-2xl relative overflow-hidden">
      <div
        className="absolute inset-0 animate-[shimmer_1.4s_ease-in-out_infinite]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)",
          transform: "translateX(-100%)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#7BB8D4]/30 border-t-[#7BB8D4] rounded-full animate-spin" />
      </div>
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
