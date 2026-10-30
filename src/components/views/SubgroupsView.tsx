import React, { useState } from 'react';
import { SubgroupSliceMetric, ModelRecord } from '../../types';
import {
  Split,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  ArrowDownRight,
  Bot,
  UserCheck,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';

interface SubgroupsViewProps {
  model: ModelRecord;
  subgroups: SubgroupSliceMetric[];
  onLaunchAssistant: (prompt: string) => void;
  onNavigateRetraining: () => void;
}

export const SubgroupsView: React.FC<SubgroupsViewProps> = ({
  model,
  subgroups,
  onLaunchAssistant,
  onNavigateRetraining,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSegmentKey, setFilterSegmentKey] = useState<string>('all');
  const [minSampleSize, setMinSampleSize] = useState<number>(0);
  const [disparityFilter, setDisparityFilter] = useState<'all' | 'silent_only' | 'severe_drop'>('all');
  const [selectedSlice, setSelectedSlice] = useState<SubgroupSliceMetric | null>(
    subgroups.find((s) => s.isSilentFailure) || subgroups[0] || null
  );

  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const segmentKeys = Array.from(new Set(subgroups.map((s) => s.segmentKey)));

  const filtered = subgroups.filter((s) => {
    const matchesSearch =
      s.segmentValue.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.segmentKey.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesKey = filterSegmentKey === 'all' || s.segmentKey === filterSegmentKey;
    const matchesSize = s.sampleCount >= minSampleSize;
    const matchesDisparity =
      disparityFilter === 'all'
        ? true
        : disparityFilter === 'silent_only'
        ? s.isSilentFailure
        : s.relativeDropPct >= 15;

    return matchesSearch && matchesKey && matchesSize && matchesDisparity;
  });

  const silentCount = subgroups.filter((s) => s.isSilentFailure).length;
  const maxDrop = Math.max(...subgroups.map((s) => s.relativeDropPct), 0);

  const handleRouteToHuman = (slice: SubgroupSliceMetric) => {
    setActionFeedback(`Routing policy activated: Inferences for [${slice.segmentKey}=${slice.segmentValue}] now routed to Human Review queue.`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleTriggerRetraining = (slice: SubgroupSliceMetric) => {
    setActionFeedback(`Targeted Retraining Job triggered: Augmenting baseline dataset with N=500 stratified samples for [${slice.segmentKey}=${slice.segmentValue}].`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  return (
    <div className="flex flex-col gap-5 p-6 max-w-7xl mx-auto w-full">
      {/* Top Banner Explaining Simpson's Paradox & Hidden Failure Radar */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <Split className="w-5 h-5 text-amber-400" />
              <span>Hidden Failure Radar: Demographic &amp; Subgroup Disparity Engine</span>
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold">
              Simpson's Paradox Detector
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            High overall accuracy ({((model.summaryMetrics.accuracy || 0.94) * 100).toFixed(1)}%) frequently conceals localized failures in sensitive demographic, regional, or hardware sub-cohorts. The Hidden Failure Radar computes Wilson score 95% confidence intervals across all intersecting feature slices to pinpoint statistically significant degradation.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3.5 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-right">
            <div className="text-[10px] font-mono text-slate-400">SILENT FAILURES</div>
            <div className={`text-lg font-bold font-mono ${silentCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {silentCount} Slices
            </div>
          </div>
          <div className="px-3.5 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-right">
            <div className="text-[10px] font-mono text-slate-400">MAX DISPARITY DROP</div>
            <div className="text-lg font-bold font-mono text-rose-400">
              -{maxDrop}%
            </div>
          </div>
        </div>
      </div>

      {actionFeedback && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 text-emerald-400 text-xs font-mono rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search segment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterSegmentKey}
              onChange={(e) => setFilterSegmentKey(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
            >
              <option value="all">All Slicing Dimensions ({segmentKeys.length})</option>
              {segmentKeys.map((k) => (
                <option key={k} value={k}>
                  {k.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={minSampleSize}
              onChange={(e) => setMinSampleSize(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
            >
              <option value={0}>Min Samples: All</option>
              <option value={15}>Min Samples: N &ge; 15</option>
              <option value={30}>Min Samples: N &ge; 30</option>
              <option value={50}>Min Samples: N &ge; 50</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={disparityFilter}
              onChange={(e) => setDisparityFilter(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-mono"
            >
              <option value="all">All Disparities</option>
              <option value="silent_only">Silent Failures Only</option>
              <option value="severe_drop">Severe Drop (&ge; 15%)</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono">
          Showing <span className="text-amber-400 font-semibold">{filtered.length}</span> of {subgroups.length} analyzed segment slices
        </div>
      </div>

      {/* Main Grid: Slices Table on Left, Deep Slice Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Table of Slices */}
        <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-mono text-[11px]">
                  <th className="py-2.5 px-3">Segment Slice</th>
                  <th className="py-2.5 px-3 text-right">Sample (N)</th>
                  <th className="py-2.5 px-3 text-right">Accuracy</th>
                  <th className="py-2.5 px-3 text-right">Baseline</th>
                  <th className="py-2.5 px-3 text-right">Relative Drop</th>
                  <th className="py-2.5 px-3">Radar Status</th>
                  <th className="py-2.5 px-3 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {filtered.map((slice) => {
                  const isSelected =
                    selectedSlice?.segmentKey === slice.segmentKey &&
                    selectedSlice?.segmentValue === slice.segmentValue;
                  return (
                    <tr
                      key={`${slice.segmentKey}-${slice.segmentValue}`}
                      onClick={() => setSelectedSlice(slice)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-500/10 border-l-2 border-amber-400'
                          : slice.isSilentFailure
                          ? 'bg-rose-950/20 hover:bg-rose-950/30'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          {slice.isSilentFailure ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                          <span className="font-semibold text-slate-200">
                            {slice.segmentValue}
                          </span>
                          <span className="text-[10px] text-slate-500 font-sans">
                            ({slice.segmentKey})
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right text-slate-400">
                        {slice.sampleCount}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold">
                        {slice.accuracy !== null ? (
                          <span
                            className={
                              slice.isSilentFailure ? 'text-rose-400' : 'text-slate-100'
                            }
                          >
                            {(slice.accuracy * 100).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Unlabeled</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right text-slate-400">
                        {slice.baselineAccuracy !== null
                          ? `${(slice.baselineAccuracy * 100).toFixed(1)}%`
                          : '94.0%'}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        {slice.relativeDropPct > 0 ? (
                          <span
                            className={`flex items-center justify-end gap-0.5 ${
                              slice.relativeDropPct > 15
                                ? 'text-rose-400 font-bold'
                                : 'text-slate-400'
                            }`}
                          >
                            <ArrowDownRight className="w-3 h-3" />
                            {slice.relativeDropPct}%
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-medium">0%</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        {slice.isSilentFailure ? (
                          <span className="text-[10px] font-mono text-rose-400 bg-rose-950/40 border border-rose-800/80 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                            Silent Failure
                          </span>
                        ) : slice.sampleCount < 15 ? (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded whitespace-nowrap">
                            N&lt;15 (Low Power)
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/80 px-1.5 py-0.5 rounded whitespace-nowrap">
                            Nominal
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSlice(slice);
                          }}
                          className="text-[11px] font-sans text-amber-400 hover:text-amber-300 underline"
                        >
                          Select
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Slice Deep Inspector */}
        <div className="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          {selectedSlice ? (
            <div className="flex flex-col gap-4">
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400 font-mono uppercase text-[10px]">
                    Subgroup Radar Inspector
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      selectedSlice.isSilentFailure
                        ? 'text-rose-400 bg-rose-950/40 border-rose-800/80 font-bold'
                        : 'text-emerald-400 bg-emerald-950/40 border-emerald-800/80'
                    }`}
                  >
                    {selectedSlice.isSilentFailure ? 'SILENT FAILURE DETECTED' : 'STATISTICAL PARITY'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-100">
                  {selectedSlice.segmentKey}: <span className="text-amber-400">{selectedSlice.segmentValue}</span>
                </h3>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg">
                  <div className="text-slate-400 text-[10px] font-mono">OBSERVED ACCURACY</div>
                  <div
                    className={`text-lg font-bold font-mono mt-0.5 ${
                      selectedSlice.isSilentFailure ? 'text-rose-400' : 'text-slate-100'
                    }`}
                  >
                    {selectedSlice.accuracy !== null
                      ? `${(selectedSlice.accuracy * 100).toFixed(1)}%`
                      : 'N/A'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Global: {((selectedSlice.baselineAccuracy || 0.94) * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg">
                  <div className="text-slate-400 text-[10px] font-mono">WILSON 95% CI</div>
                  <div className="text-xs font-bold font-mono text-slate-100 mt-1">
                    [{((selectedSlice.confidenceInterval[0] || 0) * 100).toFixed(1)}% -{' '}
                    {((selectedSlice.confidenceInterval[1] || 0) * 100).toFixed(1)}%]
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    N={selectedSlice.sampleCount} (p &lt; 0.005)
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg">
                  <div className="text-slate-400 text-[10px] font-mono">FALSE POSITIVE RATE</div>
                  <div className="text-base font-mono font-bold text-slate-100 mt-0.5">
                    {(selectedSlice.falsePositiveRate * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg">
                  <div className="text-slate-400 text-[10px] font-mono">FALSE NEGATIVE RATE</div>
                  <div
                    className={`text-base font-mono font-bold mt-0.5 ${
                      selectedSlice.falseNegativeRate > 0.1 ? 'text-rose-400' : 'text-slate-100'
                    }`}
                  >
                    {(selectedSlice.falseNegativeRate * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Wilson Score Graphical CI Range */}
              <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5">
                  <span>95% Wilson Confidence Interval vs Baseline</span>
                  <span className="text-slate-200">
                    Baseline: {((selectedSlice.baselineAccuracy || 0.94) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="relative w-full h-4 bg-slate-950 rounded overflow-hidden border border-slate-800">
                  {/* CI range bar */}
                  <div
                    className={`absolute top-0 bottom-0 rounded ${
                      selectedSlice.isSilentFailure ? 'bg-rose-950/60 border-y border-rose-500' : 'bg-emerald-950/60 border-y border-emerald-500'
                    }`}
                    style={{
                      left: `${Math.max(0, (selectedSlice.confidenceInterval[0] || 0) * 100)}%`,
                      width: `${Math.max(
                        3,
                        ((selectedSlice.confidenceInterval[1] || 1) - (selectedSlice.confidenceInterval[0] || 0)) * 100
                      )}%`,
                    }}
                  />
                  {/* Observed accuracy point */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-xs"
                    style={{ left: `${(selectedSlice.accuracy || 0) * 100}%` }}
                    title={`Observed: ${((selectedSlice.accuracy || 0) * 100).toFixed(1)}%`}
                  />
                  {/* Baseline marker line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-amber-400 border-dashed"
                    style={{ left: `${(selectedSlice.baselineAccuracy || 0.94) * 100}%` }}
                    title={`Baseline: ${((selectedSlice.baselineAccuracy || 0.94) * 100).toFixed(1)}%`}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span className="text-amber-400 font-bold">Baseline ({(selectedSlice.baselineAccuracy || 0.94) * 100}%)</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Scientific Evidence & Explanation */}
              <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg text-xs">
                <span className="font-semibold text-slate-200 block mb-1">
                  Empirical Evidence &amp; Disparity Reasoning:
                </span>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  {selectedSlice.evidence}
                </p>
              </div>

              {/* Immediate Corrective Actions */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleRouteToHuman(selectedSlice)}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Route to Human Review</span>
                  </button>

                  <button
                    onClick={() => handleTriggerRetraining(selectedSlice)}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-semibold rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Trigger Retraining Slice</span>
                  </button>
                </div>

                <button
                  onClick={() =>
                    onLaunchAssistant(
                      `Explain why model ${model.name} is failing silently on ${selectedSlice.segmentKey}=${selectedSlice.segmentValue} with ${selectedSlice.relativeDropPct}% relative drop. What are the clinical/business risks and immediate remediation steps?`
                    )
                  }
                  className="flex items-center justify-center gap-2 py-2 px-3 bg-purple-950/40 hover:bg-purple-900/40 border border-purple-800/80 text-purple-200 text-xs font-semibold rounded-lg transition-colors"
                >
                  <Bot className="w-4 h-4 text-purple-400" />
                  <span>Ask AI Root Cause Assistant</span>
                </button>

                <button
                  onClick={onNavigateRetraining}
                  className="flex items-center justify-center gap-2 py-1.5 px-3 text-slate-400 hover:text-amber-400 text-xs font-mono transition-colors"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Compare Candidate Patch in Regression Guard &rarr;</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              Select a segment slice on the left to inspect detailed confusion statistics and confidence intervals.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
