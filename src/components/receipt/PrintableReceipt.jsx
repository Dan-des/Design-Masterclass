import React from 'react';
import { useApp } from '../../context/AppContext';

export default function PrintableReceipt() {
  const {
    sessionId,
    transactionId,
    selectedTier,
    studentInfo,
    paymentResult,
    paymentStatus
  } = useApp();

  // If no payment has occurred, do not render print receipt
  if (paymentStatus !== 'completed' && !paymentResult) {
    return null;
  }

  const receiptNumber = paymentResult?.receiptNumber || 'RCP-00001';
  const paidDate = paymentResult?.paidAt
    ? new Date(paymentResult.paidAt).toUTCString()
    : new Date().toUTCString();

  return (
    <div className="printable-receipt-container hidden print:block text-black bg-white">
      {/* Receipt Header */}
      <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-tight text-black">
            Olatunde Daniel
          </h1>
          <p className="text-xs text-black uppercase tracking-wider font-mono">
            Graphics Design Masterclass • Official Payment Receipt
          </p>
          <p className="text-xs text-black mt-1">
            Instructor: Olatunde Daniel (Visual Identity Architect)
          </p>
        </div>
        <div className="text-right font-mono text-xs">
          <div className="font-bold text-sm text-black">{receiptNumber}</div>
          <div className="text-black">{paidDate}</div>
          <div className="font-bold text-black border border-black inline-block px-2 py-0.5 mt-1">
            STATUS: PAID &amp; VERIFIED
          </div>
        </div>
      </div>

      {/* Security & Audit Identifiers */}
      <div className="grid grid-cols-2 gap-4 border border-black p-4 mb-6 font-mono text-xs">
        <div>
          <span className="font-bold block uppercase text-black">Transaction ID</span>
          <span className="text-sm font-extrabold text-black">{transactionId}</span>
        </div>
        <div>
          <span className="font-bold block uppercase text-black">Session ID</span>
          <span className="text-sm font-extrabold text-black">{sessionId}</span>
        </div>
      </div>

      {/* Student Enrollment Details */}
      <div className="mb-6 border border-black p-4">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider mb-2 text-black">
          Enrolled Student Credentials
        </h2>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-black font-semibold block">Full Name:</span>
            <span className="font-bold text-black">{studentInfo?.fullName || 'N/A'}</span>
          </div>
          <div>
            <span className="text-black font-semibold block">Email Address:</span>
            <span className="font-bold text-black">{studentInfo?.email || 'N/A'}</span>
          </div>
          <div>
            <span className="text-black font-semibold block">WhatsApp Contact:</span>
            <span className="font-bold text-black">{studentInfo?.whatsapp || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Itemized Line Items Table */}
      <table className="w-full text-xs border-collapse border border-black mb-6">
        <thead>
          <tr className="border-b border-black bg-gray-100">
            <th className="text-left p-2 font-mono uppercase font-bold text-black">Item Description</th>
            <th className="text-left p-2 font-mono uppercase font-bold text-black">Scope</th>
            <th className="text-right p-2 font-mono uppercase font-bold text-black">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-black">
            <td className="p-2 font-semibold text-black">
              {selectedTier?.name} - 2026 Live Cohort
            </td>
            <td className="p-2 text-black">
              {selectedTier?.softwareScope}
            </td>
            <td className="p-2 text-right font-mono text-black">
              ₦{selectedTier?.originalPrice}
            </td>
          </tr>
          {selectedTier?.discount > 0 && (
            <tr className="border-b border-black">
              <td className="p-2 italic text-black" colSpan="2">
                Special Cohort Discount Applied (-₦{selectedTier.discount})
              </td>
              <td className="p-2 text-right font-mono text-black">
                -₦{selectedTier.discount}
              </td>
            </tr>
          )}
          <tr className="border-t-2 border-black font-bold">
            <td className="p-2 uppercase font-mono text-black" colSpan="2">
              Total Amount Paid
            </td>
            <td className="p-2 text-right font-mono text-sm text-black">
              ₦{selectedTier?.price} NGN
            </td>
          </tr>
        </tbody>
      </table>

      {/* Access & Delivery Confirmation */}
      <div className="border border-black p-4 mb-6 text-xs leading-relaxed">
        <span className="font-bold uppercase block mb-1 text-black font-mono">
          Onboarding &amp; Community Access Verification:
        </span>
        <p className="text-black mb-2">
          Your enrollment has been registered in the master enrollment roster. Digital masterclass access credentials, downloadable raw project assets, and the direct invitation link to the VIP Mentorship WhatsApp group have been dispatched to <strong>{studentInfo?.email}</strong>.
        </p>
        <p className="font-mono text-[11px] text-black">
          Legal Notice: Digital masterclass access is delivered instantly and is final sale.
        </p>
      </div>

      {/* Footer Stamp */}
      <div className="flex justify-between items-center pt-4 border-t border-black text-[10px] font-mono text-black">
        <div>OLATUNDE DANIEL • GRAPHICS DESIGN MASTERCLASS • BATCH 2026</div>
        <div>VERIFIED DIGITAL RECEIPT • TOKEN {receiptNumber}</div>
      </div>
    </div>
  );
}
