import React from 'react';
import { MetricNature } from '../types';
import { Info, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  nature: MetricNature;
  delta?: {
    value: string;
    isPositiveGood: boolean;
    isIncrease: boolean;
  };
  definition: string;
  subtext?: string;
  statusColor?: 'normal' | 'warning' | 'critical' | 'good';
  badgeExtra?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  nature,
  delta,
  definition,
  subtext,
  statusColor = 'normal',
  badgeExtra,
}) => {
  const getNatureBadge = () => {
    switch (nature) {
      case 'observed':
        return (
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded" title="Verified against empirical ground-truth labels">
            Observed
          </span>
        );
      case 'estimated':
        return (
          <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded" title="Statistical proxy estimate from distribution drift & confidence bounds">
            Estimated
          </span>
        );
      case 'unavailable':
        return (
          <span className="text-[10px] font-mono text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded" title="Insufficient ground-truth labels or telemetry">
            Unavailable
          </span>
        );
    }
  };

  const getValueColor = () => {
    switch (statusColor) {
      case 'critical':
        return 'text-rose-400';
      case 'warning':
        return 'text-amber-400';
      case 'good':
        return 'text-emerald-400';
      default:
        return 'text-white';
    }
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all duration-200 group">
      <div>
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200 transition-colors truncate" title={title}>
            {title}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {badgeExtra && (
              <span className="text-[10px] font-mono text-cyan-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded-md">
                {badgeExtra}
              </span>
            )}
            {getNatureBadge()}
          </div>
        </div>

        <div className="flex items-baseline gap-1.5 my-1.5">
          <span className={`text-2xl font-bold font-mono tracking-tight tabular-nums ${getValueColor()}`}>
            {value}
          </span>
          {unit && <span className="text-xs text-slate-400 font-mono font-medium">{unit}</span>}
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          {delta && (
            <span
              className={`flex items-center font-mono font-semibold text-xs ${
                delta.isIncrease
                  ? delta.isPositiveGood
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                  : delta.isPositiveGood
                  ? 'text-rose-400'
                  : 'text-emerald-400'
              }`}
            >
              {delta.isIncrease ? (
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
              {delta.value}
            </span>
          )}
          <span className="truncate">{subtext || 'vs baseline window'}</span>
        </div>

        <div className="group/tooltip relative cursor-help">
          <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 transition-colors" />
          <div className="absolute right-0 bottom-full mb-1.5 w-56 p-2.5 bg-slate-900 border border-slate-700 text-[11px] text-slate-200 rounded-lg shadow-xl hidden group-hover/tooltip:block z-50 pointer-events-none backdrop-blur-md">
            {definition}
          </div>
        </div>
      </div>
    </div>
  );
};
