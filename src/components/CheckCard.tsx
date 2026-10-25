import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { CheckItem } from '../types';

interface CheckCardProps {
  check: CheckItem;
}

export const CheckCard: React.FC<CheckCardProps> = ({ check }) => {
  const isPass = check.status === 'pass';
  const isWarn = check.status === 'warn';

  return (
    <div
      className={`rounded-xl border transition-all duration-200 p-4 ${
        isPass
          ? 'bg-gray-900/40 border-gray-800/80 hover:border-emerald-500/30'
          : isWarn
          ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
          : 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className="mt-0.5 shrink-0">
          {isPass && (
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}
          {isWarn && (
            <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          )}
          {!isPass && !isWarn && (
            <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400">
              <XCircle className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Title and Detail */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="text-sm font-semibold text-white tracking-tight">
              {check.name}
            </h4>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isPass
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : isWarn
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {check.status === 'pass' ? 'PASS' : check.status === 'warn' ? 'WARN' : 'FAIL'}
            </span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            {check.detail}
          </p>
        </div>
      </div>
    </div>
  );
};
