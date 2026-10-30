import React, { useState } from 'react';
import { FeatureDriftResult, ModelRecord } from '../../types';
import {
  Activity,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

interface DriftViewProps {
  model: ModelRecord;
  driftResults: FeatureDriftResult[];
  onLaunchAssistant: (prompt: string) => void;
}

export const DriftView: React.FC<DriftViewProps> = ({
  model,
  driftResults,
  onLaunchAssistant,
}) => {
  const [selectedFeature, setSelectedFeature] = useState<FeatureDriftResult>(
    driftResults.find((d) => d.hasDrifted) || driftResults[0]
  );

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'high':
        return 'text-rose-400 bg-rose-950/40 border-rose-800/80';
      case 'medium':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/80';
      case 'low':
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-800/80';
      default:
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/80';
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400" />
              <span>Statistical Data &amp; Prediction Drift Monitor</span>
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              PSI &amp; Wasserstein Methods
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Continuous evaluation of input feature distributions and output predictions against calibrated baseline datasets. Population Stability Index (PSI &gt; 0.25) and Wasserstein distances flag upstream data ingestion anomalies before silent degradation harms production outcomes.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="px-3.5 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-right">
            <div className="text-[10px] font-mono text-slate-400">DRIFTED FEATURES</div>
            <div className="text-lg font-bold font-mono text-amber-400">
              {driftResults.filter((d) => d.hasDrifted).length} / {driftResults.length}
            </div>
          </div>
        </div>
      </div>

      {/* Feature Drift Cards List & Distribution Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Feature Drift Selector Table */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-slate-400 font-mono uppercase tracking-wider">
            Monitored Feature Dimensions
          </h3>

          <div className="flex flex-col gap-2">
            {driftResults.map((d) => {
              const isSelected = selectedFeature.featureName === d.featureName;
              return (
                <div
                  key={d.featureName}
                  onClick={() => setSelectedFeature(d)}
                  className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-slate-800/80 border-amber-400 shadow-sm'
                      : 'bg-[#111827] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-sm text-slate-100 font-mono">
                      {d.featureName}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-semibold ${getSeverityBadge(
                        d.severity
                      )}`}
                    >
                      {d.severity === 'none' ? 'Nominal' : `${d.severity} Drift`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-slate-400 mt-2">
                    <span>
                      {d.driftMetric}: <strong className="text-slate-200">{d.driftScore}</strong>
                    </span>
                    <span>
                      Threshold: <span className="text-slate-400">{d.threshold}</span>
                    </span>
                    <span>
                      Missing Δ: <span className="text-slate-200">{(d.missingValueRateChange * 100).toFixed(1)}%</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Feature Distribution Histogram vs Baseline */}
        <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  Distribution Shift Comparison (Baseline vs Current)
                </span>
                <h3 className="text-base font-bold text-slate-100 font-mono mt-0.5">
                  Feature: <span className="text-amber-400">{selectedFeature.featureName}</span>
                </h3>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono text-slate-400">
                  {selectedFeature.driftMetric} Score
                </div>
                <div
                  className={`text-xl font-bold font-mono ${
                    selectedFeature.hasDrifted ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {selectedFeature.driftScore}
                </div>
              </div>
            </div>

            {/* Distribution Chart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={selectedFeature.referenceDistribution}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="bin" stroke="#475569" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis
                    stroke="#475569"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '11px',
                    }}
                    formatter={(val: any) => [`${(Number(val) * 100).toFixed(1)}%`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                  <Bar
                    dataKey="baselineShare"
                    name="Reference Baseline Share"
                    fill="#334155"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="currentShare"
                    name="Current Observed Share"
                    fill={selectedFeature.hasDrifted ? '#f59e0b' : '#06b6d4'}
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Root Cause Note */}
            <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-lg mt-4 text-xs">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                <Info className="w-3.5 h-3.5" />
                <span>Drift Diagnosis &amp; Root Cause Explanation:</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                {selectedFeature.explanation}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between mt-4">
            <span className="text-[11px] text-slate-400 font-mono">
              Baseline: <span className="text-slate-200">{model.referenceDataset}</span>
            </span>
            <button
              onClick={() =>
                onLaunchAssistant(
                  `Analyze the distribution shift for feature ${selectedFeature.featureName} on model ${model.name}. The PSI score is ${selectedFeature.driftScore}. What upstream ingestion pipeline or data source caused this, and how can we mitigate it?`
                )
              }
              className="px-3.5 py-1.5 bg-purple-950/40 hover:bg-purple-900/40 border border-purple-800/80 text-purple-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>Ask AI to Diagnose Drift</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
