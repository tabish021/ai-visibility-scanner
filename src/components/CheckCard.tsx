import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MinusCircle,
} from "lucide-react";
import { CheckItem } from "../types";

interface CheckCardProps {
  check: CheckItem;
}

export const CheckCard: React.FC<CheckCardProps> = ({ check }) => {
  const isPass = check.status === "pass";
  const isWarn = check.status === "warn";
  const isFail = check.status === "fail";
  const isNA = check.status === "N/A";

  let icon = <MinusCircle className="w-4 h-4" />;
  let colorClasses = "bg-gray-800/40 border-gray-700/50";
  let textColor = "text-gray-400";
  let badge = "N/A";

  if (isPass) {
    icon = <CheckCircle2 className="w-4 h-4" />;
    colorClasses =
      "bg-gray-900/40 border-gray-800/80 hover:border-emerald-500/30";
    textColor = "text-emerald-400";
    badge = "PASS";
  } else if (isWarn) {
    icon = <AlertTriangle className="w-4 h-4" />;
    colorClasses = "bg-amber-950/20 border-amber-500/30";
    textColor = "text-amber-400";
    badge = "WARN";
  } else if (isFail) {
    icon = <XCircle className="w-4 h-4" />;
    colorClasses = "bg-rose-950/20 border-rose-500/30";
    textColor = "text-rose-400";
    badge = "FAIL";
  }

  return (
    <div
      className={`rounded-xl border transition-all duration-200 p-4 ${colorClasses}`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 shrink-0 ${textColor}`}>
          <div
            className={`w-6 h-6 rounded-full border flex items-center justify-center ${isPass ? "bg-emerald-500/20 border-emerald-500/50" : isWarn ? "bg-amber-500/20 border-amber-500/50" : isFail ? "bg-rose-500/20 border-rose-500/50" : "bg-gray-800 border-gray-600"}`}
          >
            {icon}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="text-sm font-semibold text-white tracking-tight">
              {check.name}
            </h4>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isPass ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : isWarn ? "bg-amber-500/15 text-amber-300 border border-amber-500/30" : isFail ? "bg-rose-500/15 text-rose-400 border border-rose-500/30" : "bg-gray-800 text-gray-400 border border-gray-700"}`}
            >
              {badge}
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              Weight: {check.weight}
            </span>
          </div>

          <p className="text-xs text-gray-300 mb-2 font-medium">
            {check.found}
          </p>

          {(isFail || isWarn) && (
            <div className="mt-2 space-y-1.5 bg-gray-950/50 p-2.5 rounded-lg border border-gray-800/80">
              <p className="text-[11px] text-gray-400">
                <strong className="text-gray-300">Why it matters:</strong>{" "}
                {check.why}
              </p>
              <p className="text-[11px] text-emerald-400/90">
                <strong className="text-emerald-400">How to fix:</strong>{" "}
                {check.fix}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
