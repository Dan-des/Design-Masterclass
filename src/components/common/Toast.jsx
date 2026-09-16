import React from 'react';
import { useApp } from '../../context/AppContext';

export default function Toast() {
  const { toast } = useApp();

  if (!toast.visible) return null;

  const typeStyles = {
    success: 'bg-neutral-900/95 border-emerald-500/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]',
    error: 'bg-neutral-900/95 border-rose-500/50 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.15)]',
    warning: 'bg-neutral-900/95 border-yellow-500/50 text-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.15)]',
    info: 'bg-neutral-900/95 border-neutral-700 text-neutral-200 shadow-xl'
  };

  return (
    <div className="toast-container fixed bottom-14 right-4 z-50 max-w-sm pointer-events-none animate-fadeIn">
      <div
        className={`px-4 py-3 rounded-lg border text-xs sm:text-sm font-medium backdrop-blur-md flex items-center gap-3 ${
          typeStyles[toast.type] || typeStyles.info
        }`}
      >
        {toast.type === 'success' && (
          <svg className="w-4 h-4 flex-shrink-0 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {toast.type === 'error' && (
          <svg className="w-4 h-4 flex-shrink-0 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        )}
        {toast.type === 'warning' && (
          <svg className="w-4 h-4 flex-shrink-0 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )}
        {toast.type === 'info' && (
          <svg className="w-4 h-4 flex-shrink-0 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        )}
        <span className="leading-snug">{toast.message}</span>
      </div>
    </div>
  );
}
