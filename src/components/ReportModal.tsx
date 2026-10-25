import React, { useState } from 'react';
import { X, Check, Copy, MessageSquare, Clock, ShieldCheck, Sparkles } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain?: string;
  targetUrl?: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  domain,
  targetUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const upiId = 'tabish021@okicici';
  const whatsappNumber = '919987455707';

  if (!isOpen) return null;

  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Construct message as requested:
  // "i have paid the amount please send the Feedback Report for - (their website name)"
  const websiteInfo = domain ? ` for - ${domain}` : targetUrl ? ` for - ${targetUrl}` : '';
  const messageText = `i have paid the amount please send the Feedback Report${websiteInfo}`;
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(messageText)}`;

  const rifahMessage = `Hi, I am a Member of RIFAH, please send the Feedback Report for - ${domain || targetUrl || 'my website'}`;
  const rifahWhatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(rifahMessage)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-gray-950 border border-emerald-500/30 shadow-2xl p-6 text-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Accents */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide uppercase mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Comprehensive Feedback Report
          </div>
          <h3 className="text-xl font-extrabold text-white tracking-tight">
            Order Your Feedback Report
          </h3>
          <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 mt-1 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>Turnaround Time (TAT): 2-4 hours</span>
          </div>
          {domain && (
            <p className="text-xs text-gray-400 mt-1 font-mono">
              Audit Target: <span className="text-gray-200 font-semibold">{domain}</span>
            </p>
          )}
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center my-3">
          <div className="relative p-2.5 bg-white rounded-2xl shadow-xl border-2 border-emerald-500/40 max-w-[240px] w-full">
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-10-24_at_17.44.45_0eb09f36.jpeg"
              alt="Scan QR code to pay with any UPI app"
              className="w-full h-auto object-contain rounded-xl"
            />
          </div>
        </div>

        {/* UPI ID Row */}
        <div className="mb-4 bg-gray-900 border border-gray-800 rounded-xl p-2.5 flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0 pl-1">
            <span className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">
              UPI ID
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold text-white truncate">
              {upiId}
            </span>
          </div>

          <button
            onClick={copyUpiId}
            type="button"
            className="btn-water btn-water-emerald flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/40 shrink-0 cursor-pointer active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy ID</span>
              </>
            )}
          </button>
        </div>

        {/* "Yes, Paid" and RIFAH Member Action Buttons */}
        <div className="space-y-2.5">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-water btn-water-dark w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-emerald-500 text-gray-950 font-extrabold text-sm tracking-wide shadow-lg shadow-emerald-500/25 cursor-pointer glow-green-sm"
          >
            <MessageSquare className="w-4 h-4 fill-current" />
            <span>Yes, Paid</span>
          </a>

          <div className="flex items-center gap-2 my-0.5">
            <div className="flex-1 h-px bg-gray-800"></div>
            <span className="text-[10px] uppercase font-mono text-gray-500">or</span>
            <div className="flex-1 h-px bg-gray-800"></div>
          </div>

          <a
            href={rifahWhatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-water btn-water-emerald w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 border border-emerald-500/40 text-emerald-300 font-bold text-xs tracking-wide cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>RIFAH Member</span>
          </a>

          <p className="text-center text-[11px] text-gray-400 leading-relaxed px-2 pt-0.5">
            Connects directly to WhatsApp (+91 9987455707) to receive your Feedback Report.
          </p>
        </div>
      </div>
    </div>
  );
};
