import React from 'react';
import { ShieldCheck, AlertTriangle, XCircle, Sparkles } from 'lucide-react';
import { ScanResult } from '../types';

interface ScoreGaugeProps {
  result: ScanResult;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ result }) => {
  const { score, grade, gradeDescription, summary, categories } = result;

  // SVG circular calculations
  const size = 220;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Determine color scheme
  let ringColor = '#22c55e'; // Green
  let glowClass = 'glow-green';
  let badgeBg = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

  if (score < 60) {
    ringColor = '#ef4444'; // Red
    glowClass = 'glow-red';
    badgeBg = 'bg-rose-500/15 text-rose-400 border-rose-500/30';
  } else if (score < 85) {
    ringColor = '#f59e0b'; // Amber
    glowClass = 'glow-amber';
    badgeBg = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  }

  return (
    <div className="flex flex-col items-center">
      {/* Circular SVG Gauge */}
      <div className={`relative flex items-center justify-center p-2 rounded-full ${glowClass}`}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="rotate-[-90deg] transition-all duration-1000 ease-out"
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#1f2937"
            strokeWidth={strokeWidth}
          />
          {/* Animated Value Ring */}
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

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
          <span className="text-5xl font-extrabold tracking-tight text-white font-mono">
            {score}
          </span>
          <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase mt-0.5">
            Out of 100
          </span>
        </div>
      </div>

      {/* Grade and Title */}
      <div className="mt-5 text-center max-w-lg">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold tracking-wide border uppercase mb-2"
          style={{
            borderColor: score >= 85 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444',
            backgroundColor: score >= 85 ? 'rgba(34, 197, 94, 0.1)' : score >= 60 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: score >= 85 ? '#4ade80' : score >= 60 ? '#fbbf24' : '#f87171'
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {grade}
        </div>
        <p className="text-sm text-gray-400 leading-relaxed px-4">
          {gradeDescription}
        </p>
      </div>

      {/* Summary counters */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-md mt-6">
        <div className="flex flex-col items-center p-3 rounded-xl bg-gray-900/80 border border-emerald-500/20">
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Passed
          </div>
          <span className="text-2xl font-bold font-mono text-emerald-300">
            {summary.pass}
          </span>
          <span className="text-[10px] text-gray-400">/ 17 checks</span>
        </div>

        <div className="flex flex-col items-center p-3 rounded-xl bg-gray-900/80 border border-amber-500/20">
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Warnings
          </div>
          <span className="text-2xl font-bold font-mono text-amber-300">
            {summary.warn}
          </span>
          <span className="text-[10px] text-gray-400">Needs attention</span>
        </div>

        <div className="flex flex-col items-center p-3 rounded-xl bg-gray-900/80 border border-rose-500/20">
          <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <XCircle className="w-3.5 h-3.5" />
            Failed
          </div>
          <span className="text-2xl font-bold font-mono text-rose-300">
            {summary.fail}
          </span>
          <span className="text-[10px] text-gray-400">Blocking AI</span>
        </div>
      </div>

      {/* Category Mini-Bars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl mt-4">
        <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800">
          <div className="flex justify-between items-center text-xs text-gray-400 mb-1.5">
            <span className="font-semibold text-gray-300">SEO (Search Engine)</span>
            <span className="font-mono text-emerald-400 font-bold">{categories.seo.score}%</span>
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${categories.seo.score}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-400 mt-1">5 core crawl signals</div>
        </div>

        <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800">
          <div className="flex justify-between items-center text-xs text-gray-400 mb-1.5">
            <span className="font-semibold text-gray-300">GEO (AI Visibility)</span>
            <span className="font-mono text-cyan-400 font-bold">{categories.geo.score}%</span>
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-cyan-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${categories.geo.score}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-400 mt-1">6 LLM ingestion signals</div>
        </div>

        <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800">
          <div className="flex justify-between items-center text-xs text-gray-400 mb-1.5">
            <span className="font-semibold text-gray-300">AEO (Answer Engines)</span>
            <span className="font-mono text-purple-400 font-bold">{categories.aeo.score}%</span>
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${categories.aeo.score}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-400 mt-1">6 direct citation signals</div>
        </div>
      </div>
    </div>
  );
};
