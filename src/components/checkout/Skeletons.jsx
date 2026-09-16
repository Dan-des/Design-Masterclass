import React from 'react';

export function PaymentProcessingSkeleton() {
  return (
    <div className="py-10 px-4 flex flex-col items-center justify-center text-center">
      {/* Animated pulse circle */}
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-yellow-400/30 animate-ping" />
        <div className="relative w-16 h-16 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
        </div>
      </div>

      <div className="h-6 w-48 bg-neutral-800 rounded animate-pulse mb-3" />
      <div className="h-4 w-72 bg-neutral-800/60 rounded animate-pulse mb-8" />

      {/* Itemized skeleton lines */}
      <div className="w-full max-w-sm space-y-3 p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
        <div className="flex justify-between">
          <div className="h-3.5 w-24 bg-neutral-800 rounded animate-pulse" />
          <div className="h-3.5 w-16 bg-neutral-800 rounded animate-pulse" />
        </div>
        <div className="flex justify-between">
          <div className="h-3.5 w-32 bg-neutral-800 rounded animate-pulse" />
          <div className="h-3.5 w-20 bg-neutral-800 rounded animate-pulse" />
        </div>
        <div className="pt-2 border-t border-neutral-800 flex justify-between">
          <div className="h-4 w-28 bg-neutral-700 rounded animate-pulse" />
          <div className="h-4 w-16 bg-neutral-700 rounded animate-pulse" />
        </div>
      </div>

      <p className="text-xs text-neutral-400 mt-6 font-mono">
        Connecting to payment gateway...
      </p>
    </div>
  );
}

export function FormLoadingSkeleton() {
  return (
    <div className="space-y-4 py-4 animate-pulse">
      <div className="h-10 bg-neutral-800/70 rounded-lg" />
      <div className="h-10 bg-neutral-800/70 rounded-lg" />
      <div className="h-10 bg-neutral-800/70 rounded-lg" />
      <div className="h-12 bg-neutral-800 rounded-lg mt-6" />
    </div>
  );
}
