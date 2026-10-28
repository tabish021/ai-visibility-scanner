import React, { useEffect, useState } from "react";
import { Bot, Search, Database, Globe2, Loader2, Sparkles } from "lucide-react";

interface ScanSkeletonProps {
  targetUrl: string;
}

const SCAN_STEPS = [
  "Resolving domain and establishing secure connection...",
  "Fetching raw server HTML response (Access & Indexability)...",
  "Auditing indexability, meta robots, and sitemaps...",
  "Testing bots (GPTBot, PerplexityBot) and firewalls...",
  "Parsing SEO title, description, and heading hierarchy...",
  "Measuring page speed and Core Web Vitals...",
  "Extracting JSON-LD Schema and Organization entities...",
  "Scanning for E-E-A-T trust signals and social profiles...",
  "Synthesizing 19-point AI Visibility Score...",
];

export const ScanSkeleton: React.FC<ScanSkeletonProps> = ({ targetUrl }) => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev < SCAN_STEPS.length - 1 ? prev + 1 : prev));
    }, 800); // Slightly slower so they can read the text
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto py-8">
      {/* Central Radar Pulse */}
      <div className="flex flex-col items-center justify-center mb-8">
        <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-gray-900 border border-emerald-500/40 shadow-2xl glow-green">
          {/* Animated concentric rings */}
          <div className="absolute inset-0 rounded-full border border-emerald-500/30 animate-ping opacity-25"></div>
          <div className="absolute -inset-3 rounded-full border border-emerald-500/20 animate-pulse"></div>

          <div className="relative z-10 flex flex-col items-center justify-center text-emerald-400">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
          </div>
        </div>

        <div className="mt-5 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono mb-2">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            Active Scan: {targetUrl}
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            Running 19-Point AI Visibility Diagnostic
          </h3>
          <p className="text-xs text-gray-400 font-mono mt-1 min-h-[20px] transition-all">
            {SCAN_STEPS[stepIndex]}
          </p>
        </div>
      </div>

      {/* Category Skeletons */}
      <div className="space-y-6">
        {/* SEO Group */}
        <div className="p-5 rounded-2xl bg-gray-900/40 border border-gray-800/80 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-500/40"></div>
              <div className="h-4 w-32 bg-gray-800 rounded"></div>
            </div>
            <div className="h-4 w-12 bg-gray-800 rounded"></div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 bg-gray-950/60 rounded-xl border border-gray-800/60 flex items-center px-4 gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-gray-800 shrink-0"></div>
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-40 bg-gray-800 rounded"></div>
                  <div className="h-2.5 w-3/4 bg-gray-800/60 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GEO Group */}
        <div className="p-5 rounded-2xl bg-gray-900/40 border border-gray-800/80 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-cyan-500/40"></div>
              <div className="h-4 w-44 bg-gray-800 rounded"></div>
            </div>
            <div className="h-4 w-12 bg-gray-800 rounded"></div>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 bg-gray-950/60 rounded-xl border border-gray-800/60 flex items-center px-4 gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-gray-800 shrink-0"></div>
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-48 bg-gray-800 rounded"></div>
                  <div className="h-2.5 w-2/3 bg-gray-800/60 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
