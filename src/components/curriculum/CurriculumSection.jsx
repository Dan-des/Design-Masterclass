import React from 'react';
import CurriculumCard from './CurriculumCard';

export default function CurriculumSection() {
  const modules = [
    {
      moduleNumber: '01',
      title: 'Brand Identity & Systematic Visual Systems',
      subtitle: 'Building enduring brand marks, dynamic design systems, and responsive logo suites.',
      deliverables: 'Complete Brand Identity Manual',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      ),
      topics: [
        'Strategic Brief Deconstruction & Client Archetypes',
        'Logo Architecture: Monograms, Wordmarks & Abstract Emblems',
        'Vector Construction & Bezier Precision in Adobe Illustrator',
        'Comprehensive Brand Guidelines Documentation System',
        'Scalability Stress-Testing for Micro-Favicons & Large Billboards'
      ]
    },
    {
      moduleNumber: '02',
      title: 'Advanced Typography & Editorial Hierarchy',
      subtitle: 'Mastering optical sizing, font pairings, mathematical scale rhythms, and structural grid rules.',
      deliverables: 'Editorial Magazine Specimen & Layout Grid',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="9" y1="20" x2="15" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
      ),
      topics: [
        'Macro & Micro Typography: Kerning, Leading, and Tracking Math',
        'Multi-Column Grid Architecture in Adobe InDesign & Figma',
        'High-Impact Headline Pairing with Clean Body Sans-Serifs',
        'Managing Typographic Color, Contrast, and White-Space Rhythms',
        'Editorial Cover Design & Dynamic Spatial Page Pacing'
      ]
    },
    {
      moduleNumber: '03',
      title: 'Spatial Composition, Color Science & Layout',
      subtitle: 'Color psychology, gamut workflows, visual hierarchy, and cinematic photographic composite grading.',
      deliverables: 'High-Fidelity Commercial Campaign Posters',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      ),
      topics: [
        'Color Harmonies, CMYK vs RGB Profiles, and Gamut Clipping Guards',
        'Camera Raw Grading, Frequency Separation, and High-End Retouching',
        'Gestalt Principles of Visual Perception and Depth Stacking',
        'Dynamic Lighting Effects, Shadows, and Ambient Occlusion in Photoshop',
        'Balancing Information Density for Commercial Billboards & Social Media'
      ]
    },
    {
      moduleNumber: '04',
      title: 'Commercial Production & Client Business Strategy',
      subtitle: 'From prepress packaging proofing to closing international corporate clients.',
      deliverables: 'Commercial Pitch Deck & Client Contract Suite',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
      topics: [
        'Prepress Print Production: Bleeds, Trapping, Spot Colors & Dielines',
        'Pricing Your Creative Work: Value-Based Pricing Models',
        'Drafting Ironclad Design Service Agreements & Scope Creep Guards',
        'Structuring High-Converting Client Pitch Decks in Figma',
        'Asset Export Pipeline for Web, Mobile, and Vector Production'
      ]
    }
  ];

  return (
    <section id="curriculum-section" className="py-20 md:py-28 bg-[#0d0d0d] border-t border-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-yellow-400 text-xs font-mono font-semibold uppercase mb-4">
            Curriculum Architecture
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-5">
            Engineered For Commercial Precision
          </h2>
          <p className="text-base sm:text-lg text-neutral-400">
            Every module is designed to eliminate guesswork, equipping you with the exact technical and strategic execution demanded by international agencies and premium corporate clients.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {modules.map((mod) => (
            <CurriculumCard key={mod.moduleNumber} {...mod} />
          ))}
        </div>
      </div>
    </section>
  );
}
