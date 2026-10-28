import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Square,
  CheckSquare,
  MinusCircle,
} from "lucide-react";
import { CheckItem } from "../types";

interface CheckCardProps {
  check: CheckItem;
  isFixed?: boolean;
  onToggleFix?: (id: string) => void;
}

export const CheckCard: React.FC<CheckCardProps> = ({
  check,
  isFixed,
  onToggleFix,
}) => {
  // Normalize status to uppercase to prevent casing issues
  const statusStr = (check.status || "").toUpperCase();

  const isPass = statusStr === "PASS";
  const isWarn = statusStr === "WARN";
  const isFail = statusStr === "FAIL";

  return (
    <div
      className={`rounded-xl border transition-all duration-200 p-4 ${
        isFixed
          ? "bg-gray-800/30 border-gray-700/50 opacity-60"
          : isPass
            ? "bg-gray-900/40 border-gray-800/80 hover:border-emerald-500/30"
            : isWarn
              ? "bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50"
              : isFail
                ? "bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50"
                : "bg-gray-800/40 border-gray-700/50"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Fix Toggle Checkbox */}
        {!isPass && onToggleFix && (
          <button
            onClick={() => onToggleFix(check.id)}
            className="mt-0.5 shrink-0 text-gray-400 hover:text-emerald-400 transition-colors"
            title={isFixed ? "Mark as unfixed" : "Mark as fixed"}
          >
            {isFixed ? (
              <CheckSquare className="w-5 h-5 text-emerald-400" />
            ) : (
              <Square className="w-5 h-5" />
            )}
          </button>
        )}

        <div className="mt-0.5 shrink-0">
          {isPass ? (
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          ) : isWarn ? (
            <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          ) : isFail ? (
            <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400">
              <XCircle className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-gray-400">
              <MinusCircle className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4
              className={`text-sm font-semibold tracking-tight ${isFixed ? "text-gray-500 line-through" : "text-white"}`}
            >
              {check.name}
            </h4>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isFixed
                  ? "bg-gray-800 text-gray-400 border border-gray-700"
                  : isPass
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : isWarn
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                      : isFail
                        ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                        : "bg-gray-800 text-gray-400 border border-gray-700"
              }`}
            >
              {isFixed ? "FIXED" : statusStr === "N/A" ? "N/A" : statusStr}
            </span>
          </div>
          <p
            className={`text-xs leading-relaxed ${isFixed ? "text-gray-600" : "text-gray-300"}`}
          >
            {check.found}
          </p>

          {(isFail || isWarn) && !isFixed && (
            <div className="mt-3 space-y-1.5 bg-gray-950/50 p-2.5 rounded-lg border border-gray-800/80">
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
