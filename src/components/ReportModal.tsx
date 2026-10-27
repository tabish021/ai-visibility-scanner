import React, { useState } from "react";
import {
  X,
  Check,
  Copy,
  MessageSquare,
  Sparkles,
  Tag,
  AlertCircle,
} from "lucide-react";

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
  const [couponCode, setCouponCode] = useState("");
  const [isCouponApplied, setIsCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState(false);

  const upiId = "tabish021@okicici";
  const whatsappNumber = "919987455707";

  if (!isOpen) return null;

  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleApplyCoupon = () => {
    if (couponCode.trim().toUpperCase() === "RIFAH") {
      setIsCouponApplied(true);
      setCouponError(false);
    } else {
      setCouponError(true);
      setIsCouponApplied(false);
    }
  };

  const websiteInfo = domain
    ? ` for - ${domain}`
    : targetUrl
      ? ` for - ${targetUrl}`
      : "";

  const messageText = isCouponApplied
    ? `I used the RIFAH coupon code, please send the Feedback Report${websiteInfo}`
    : `i have paid the amount please send the Feedback Report${websiteInfo}`;

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(messageText)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-gray-950 border border-emerald-500/30 shadow-2xl p-6 text-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide uppercase mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Comprehensive Feedback Report
          </div>
          <h3 className="text-xl font-extrabold text-white tracking-tight">
            Order Your Feedback Report for{" "}
            <span className="text-emerald-400">₹99</span>
          </h3>
          {domain && (
            <p className="text-xs text-gray-400 mt-1 font-mono">
              Audit Target:{" "}
              <span className="text-gray-200 font-semibold">{domain}</span>
            </p>
          )}
        </div>

        {/* Coupon Input Section */}
        <div className="mb-4 bg-gray-900 border border-gray-800 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">
              Have a Coupon Code?
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value);
                setCouponError(false);
              }}
              placeholder="Enter code"
              className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-500"
              disabled={isCouponApplied}
            />
            <button
              onClick={handleApplyCoupon}
              disabled={!couponCode.trim() || isCouponApplied}
              className="px-4 py-2 rounded-lg bg-emerald-500 text-gray-950 font-bold text-sm disabled:opacity-50 transition-colors"
            >
              {isCouponApplied ? "Applied" : "Apply"}
            </button>
          </div>
          {couponError && (
            <p className="text-xs text-rose-400 mt-2 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Invalid code. Please try
              again.
            </p>
          )}
          {isCouponApplied && (
            <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1 font-semibold">
              <Check className="w-3 h-3" /> Code applied! Your report is free.
            </p>
          )}
        </div>

        {/* Payment Section (Only shows if no coupon is applied) */}
        {!isCouponApplied && (
          <>
            <div className="flex flex-col items-center justify-center my-2">
              <div className="relative p-2.5 bg-white rounded-2xl shadow-xl border-2 border-emerald-500/40 max-w-[200px] w-full">
                <img
                  src="/assets/aistudio/WhatsApp_Image_2026-10-24_at_17.44.45_0eb09f36.jpeg"
                  alt="Scan QR code to pay with any UPI app"
                  className="w-full h-auto object-contain rounded-xl"
                />
              </div>
            </div>

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
          </>
        )}

        {/* Action Button */}
        <div className="space-y-2.5">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-water btn-water-dark w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-emerald-500 text-gray-950 font-extrabold text-sm tracking-wide shadow-lg shadow-emerald-500/25 cursor-pointer glow-green-sm"
          >
            <MessageSquare className="w-4 h-4 fill-current" />
            <span>
              {isCouponApplied
                ? "Claim Free Report via WhatsApp"
                : "Yes, Paid ₹99"}
            </span>
          </a>
          <p className="text-center text-[11px] text-gray-400 leading-relaxed px-2 pt-0.5">
            Connects directly to WhatsApp (+91 9987455707) to receive your
            Feedback Report.
          </p>
        </div>
      </div>
    </div>
  );
};
