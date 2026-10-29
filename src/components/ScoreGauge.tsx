import React from "react";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Sparkles,
  Lock,
} from "lucide-react";
import { ScanResult } from "../types";

interface ScoreGaugeProps {
  result: ScanResult;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ result }) => {
  const { overall, categories, checks } = result;

  // Ensure the score is a valid number between 0 and 100
  const safeScore =
    typeof overall.score === "number" && !isNaN(overall.score)
      ? overall.score
      : 0;

  const passCount = checks.filter(
    (c) => (c.status || "").toUpperCase() === "PASS",
  ).length;
  const warnCount = checks.filter(
    (c) => (c.status || "").toUpperCase() === "WARN",
  ).length;
  const failCount = checks.filter(
    (c) => (c.status || "").toUpperCase() === "FAIL",
  ).length;

  const size = 220;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  let ringColor = "#22c55e";
  let glowClass = "glow-green";

  if (safeScore < 50 || overall.capped) {
    ringColor = "#ef4444";
    glowClass = "glow-red";
  } else if (safeScore < 75) {
    ringColor = "#f59e0b";
    glowClass = "glow-amber";
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative flex items-center justify-center p-2 rounded-full ${glowClass}`}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rotate-[-90deg] transition-all duration-1000 ease-out"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#1f2937"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className="text-5xl font-extrabold tracking-tight text-white font-mono">
            {Math.round(safeScore)}
          </span>
          <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase mt-0.5">
            Out of 100
          </span>
        </div>
      </div>

      <div className="mt-5 text-center max-w-lg">
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold tracking-wide border uppercase mb-2"
          style={{
            borderColor: overall.capped
              ? "#ef4444"
              : safeScore >= 75
                ? "#22c55e"
                : safeScore >= 50
                  ? "#f59e0b"
                  : "#ef4444",
            backgroundColor: overall.capped
              ? "rgba(239, 68, 68, 0.1)"
              : safeScore >= 75
                ? "rgba(34, 197, 94, 0.1)"
                : safeScore >= 50
                  ? "rgba(245, 158, 11, 0.1)"
                  : "rgba(239, 68, 68, 0.1)",
            color: overall.capped
              ? "#f87171"
              : safeScore >= 75
                ? "#4ade80"
                : safeScore >= 50
                  ? "#fbbf24"
                  : "#f87171",
          }}
        >
          {overall.capped ? (
            <Lock className="w-3.5 h-3.5" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {overall.label || "Scan Complete"}
        </div>
        <p className="text-sm text-gray-400 leading-relaxed px-4">
          {overall.disclaimer}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-md mt-6">
        <div className="flex flex-col items-center p-3 rounded-xl bg-gray-900/80 border border-emerald-500/20">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Passed
          </div>
          <span className="text-2xl font-bold font-mono text-emerald-300">
            {passCount}
          </span>
          <span className="text-[10px] text-gray-400">Checks</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-xl bg-gray-900/80 border border-amber-500/20">
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Warnings
          </div>
          <span className="text-2xl font-bold font-mono text-amber-300">
            {warnCount}
          </span>
          <span className="text-[10px] text-gray-400">Needs attention</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-xl bg-gray-900/80 border border-rose-500/20">
          <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <XCircle className="w-3.5 h-3.5" /> Failed
          </div>
          <span className="text-2xl font-bold font-mono text-rose-300">
            {failCount}
          </span>
          <span className="text-[10px] text-gray-400">Blocking AI</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl mt-4">
        <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800">
          <div className="flex justify-between items-center text-xs text-gray-400 mb-1.5">
            <span className="font-semibold text-gray-300">SEO (Access)</span>
            <span className="font-mono text-emerald-400 font-bold">
              {categories?.A?.score || 0}%
            </span>
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${categories?.A?.score || 0}%` }}
            />
          </div>
        </div>
        <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800">
          <div className="flex justify-between items-center text-xs text-gray-400 mb-1.5">
            <span className="font-semibold text-gray-300">GEO (Quality)</span>
            <span className="font-mono text-cyan-400 font-bold">
              {categories?.B?.score || 0}%
            </span>
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-cyan-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${categories?.B?.score || 0}%` }}
            />
          </div>
        </div>
        <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800">
          <div className="flex justify-between items-center text-xs text-gray-400 mb-1.5">
            <span className="font-semibold text-gray-300">AEO (Trust)</span>
            <span className="font-mono text-purple-400 font-bold">
              {categories?.C?.score || 0}%
            </span>
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${categories?.C?.score || 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
