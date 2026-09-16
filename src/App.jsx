import React from 'react';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HeroSection from './components/hero/HeroSection';
import CurriculumSection from './components/curriculum/CurriculumSection';
import PricingSection from './components/pricing/PricingSection';
import CheckoutModal from './components/checkout/CheckoutModal';
import SupportModal from './components/support/SupportModal';
import NoiseOverlay from './components/common/NoiseOverlay';
import NetworkStatusBanner from './components/common/NetworkStatusBanner';
import Toast from './components/common/Toast';
import PrintableReceipt from './components/receipt/PrintableReceipt';

export default function App() {
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#f3f4f6] relative flex flex-col selection:bg-yellow-400 selection:text-black">
      {/* Noise grain texture overlay */}
      <NoiseOverlay />

      {/* Real-time offline detection banner */}
      <NetworkStatusBanner />

      {/* Floating Sticky Header */}
      <Header />

      {/* Main Content Areas */}
      <main className="flex-grow">
        <HeroSection />
        <CurriculumSection />
        <PricingSection />
      </main>

      {/* Minimal Footer strictly rendering "©2026" */}
      <Footer />

      {/* On-Page 3-Step Checkout Drawer / Modal */}
      <CheckoutModal />

      {/* On-Page Support Desk Drawer / Modal */}
      <SupportModal />

      {/* Toast Feedback notifications */}
      <Toast />

      {/* Dedicated @media print clean receipt layout */}
      <PrintableReceipt />
    </div>
  );
}
