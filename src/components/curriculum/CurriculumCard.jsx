import React, { useState } from 'react';

export default function CurriculumCard({ moduleNumber, title, subtitle, icon, topics, deliverables }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 transition-all duration-200 p-6 flex flex-col justify-between hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
      <div>
        {/* Card Header with Module Index and Custom Inline SVG */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono font-bold tracking-wider text-yellow-400 uppercase bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-1 rounded">
            Module {moduleNumber}
          </span>
          <div className="w-9 h-9 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300">
            {icon}
          </div>
        </div>

        <h3 className="text-xl font-bold text-white mb-2 leading-snug">
          {title}
        </h3>
        <p className="text-sm text-neutral-400 mb-5 leading-relaxed">
          {subtitle}
        </p>

        {/* Topic Bullets */}
        <ul className="space-y-2.5 mb-6 text-sm text-neutral-300">
          {topics.slice(0, isExpanded ? topics.length : 3).map((topic, index) => (
            <li key={index} className="flex items-start gap-2.5">
              <svg
                className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{topic}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        {/* Deliverables pill */}
        <div className="pt-4 border-t border-neutral-800/80 mb-3 flex items-center justify-between text-xs">
          <span className="text-neutral-500 font-mono uppercase">Key Deliverable</span>
          <span className="text-white font-medium bg-black/50 px-2 py-0.5 rounded border border-neutral-800">
            {deliverables}
          </span>
        </div>

        {topics.length > 3 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-semibold text-neutral-400 hover:text-yellow-400 transition-colors flex items-center gap-1 focus:outline-none"
          >
            <span>{isExpanded ? 'Show Less' : `+ ${topics.length - 3} More Topics`}</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
