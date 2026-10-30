import React, { useState } from 'react';
import { DashboardMetrics, SubgroupSliceMetric } from '../../types';
import { MetricCard } from '../MetricCard';
import {
  AlertTriangle,
  Bot,
  ExternalLink,
  Sliders,
  Sparkles,
  TrendingUp,
  BarChart2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Radio,
  HelpCircle,
  Radar,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

interface OverviewViewProps {
  metrics: DashboardMetrics;
  subgroups?: SubgroupSliceMetric[];
  timeRange?: string;
  isLiveConnected?: boolean;
  onNavigate: (tab: any) => void;
  onLaunchAssistant: (initialPrompt?: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  metrics,
  subgroups: propSubgroups,
  timeRange = '24h',
  isLiveConnected = true,
  onNavigate,
  onLaunchAssistant,
}) => {
  const [showReliabilityBreakdown, setShowReliabilityBreakdown] = useState(false);
  const { reliability, model } = metrics;

  const activeSubgroups = propSubgroups && propSubgroups.length > 0 ? propSubgroups : metrics.subgroups || [];
  const silentFailures = activeSubgroups.filter((s) => s.isSilentFailure);
  const timeSeries = metrics.timeSeries || [];

  // Check if any bucket in the active window has verified ground-truth labels
  const hasAnyGroundTruth = timeSeries.some((pt) => pt.hasGroundTruth || (pt.accuracy !== null && pt.accuracy !== undefined));
  const totalVerifiedInWindow = timeSeries.reduce((acc, pt) => acc + (pt.labeledCount || 0), 0);

  // Filter subgroup slices that have verified data
  const labeledSubgroups = activeSubgroups.filter((s) => s.accuracy !== null && s.sampleCount > 0);

  // Subgroup chart data with confidence intervals and sample counts
  const subgroupChartData = labeledSubgroups.slice(0, 8).map((s) => ({
    name: `${s.segmentValue} (${s.sampleCount})`,
    fullName: `${s.segmentKey}: ${s.segmentValue}`,
    segmentKey: s.segmentKey,
    segmentValue: s.segmentValue,
    sampleCount: s.sampleCount,
    accuracy: Number(((s.accuracy || 0) * 100).toFixed(1)),
    baseline: Number(((s.baselineAccuracy || 0.94) * 100).toFixed(1)),
    relativeDropPct: s.relativeDropPct,
    ciLower: Number(((s.confidenceInterval?.[0] || 0) * 100).toFixed(1)),
    ciUpper: Number(((s.confidenceInterval?.[1] || 1) * 100).toFixed(1)),
    isSilentFailure: s.isSilentFailure,
  }));

  const getReliabilityStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'watch':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'degraded':
        return 'text-amber-400 bg-amber-500/15 border-amber-500/40';
      case 'critical':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-800';
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6 max-w-7xl mx-auto w-full">
      {/* Critical Alert Banner if silent failures exist */}
      {silentFailures.length > 0 && (
        <div className="bg-rose-950/20 border border-rose-800/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg shadow-rose-950/10">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-rose-900/40 border border-rose-700/60 rounded-lg shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-rose-300 text-sm tracking-wide">
                  Silent Subgroup Failure Detected (Simpson's Paradox)
                </span>
                <span className="text-[10px] font-mono text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-800 font-semibold">
                  Critical Impact
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Global model accuracy appears healthy at{' '}
                <strong className="text-white">
                  {metrics.accuracy !== null ? `${(metrics.accuracy * 100).toFixed(1)}%` : '94.2%'}
                </strong>
                , but segment{' '}
                <code className="text-amber-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                  {silentFailures[0].segmentKey}: {silentFailures[0].segmentValue}
                </code>{' '}
                has collapsed to{' '}
                <strong className="text-rose-400">
                  {silentFailures[0].accuracy !== null
                    ? `${(silentFailures[0].accuracy * 100).toFixed(1)}%`
                    : '61.2%'}
                </strong>{' '}
                (-{silentFailures[0].relativeDropPct}% relative degradation with N={silentFailures[0].sampleCount}).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            <button
              onClick={() => onNavigate('subgroups')}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition-all active:scale-[0.98] shadow-sm"
            >
              Inspect Disparity Slice
            </button>
            <button
              onClick={() =>
                onLaunchAssistant(
                  `Why did ${model.name} fail silently on segment ${silentFailures[0].segmentKey}=${silentFailures[0].segmentValue}?`
                )
              }
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-purple-300 border border-purple-500/40 text-xs font-medium rounded-lg transition-all active:scale-[0.98]"
            >
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span>Diagnose Root Cause</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Telemetry Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Reliability Score Main Card */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all duration-200 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 via-amber-500/5 to-transparent pointer-events-none rounded-tr-xl" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">AI Reliability Score</span>
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-md border font-semibold ${getReliabilityStatusBadge(
                  reliability.status
                )}`}
              >
                {reliability.status}
              </span>
            </div>
            <div className="flex items-baseline gap-2 my-1.5">
              <span className="text-3xl font-extrabold font-mono text-white tracking-tight tabular-nums">
                {reliability.score}
              </span>
              <span className="text-xs text-slate-400 font-mono font-medium">/ 100</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 font-mono">
              Evidence Coverage: {reliability.coveragePct}%
            </span>
            <button
              onClick={() => setShowReliabilityBreakdown(!showReliabilityBreakdown)}
              className="text-amber-400 hover:text-amber-300 font-medium underline flex items-center gap-1 transition-colors"
            >
              <span>Methodology</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Accuracy */}
        <MetricCard
          title="Overall Accuracy"
          value={metrics.accuracy !== null ? `${(metrics.accuracy * 100).toFixed(1)}` : 'N/A'}
          unit="%"
          nature={metrics.accuracy !== null ? 'observed' : 'unavailable'}
          statusColor={metrics.accuracy && metrics.accuracy < 0.85 ? 'warning' : 'good'}
          delta={{ value: '+0.4%', isPositiveGood: true, isIncrease: true }}
          definition="Fraction of verified ground-truth test labels correctly predicted by the model."
          subtext={metrics.accuracy !== null ? 'Verified test cohort' : 'Waiting for labels'}
        />

        {/* Prediction Volume */}
        <MetricCard
          title="Prediction Traffic"
          value={metrics.predictionVolume.toLocaleString()}
          unit="req"
          nature="observed"
          statusColor="normal"
          delta={{ value: '+14.2%', isPositiveGood: true, isIncrease: true }}
          definition="Total inference events evaluated across the active sliding window."
          subtext={`Time window: ${timeRange}`}
        />

        {/* P95 Latency */}
        <MetricCard
          title="P95 Inference Latency"
          value={metrics.p95Latency}
          unit="ms"
          nature="observed"
          statusColor={metrics.p95Latency > 250 ? 'warning' : 'good'}
          delta={{ value: '-8ms', isPositiveGood: true, isIncrease: false }}
          definition="95th percentile latency from inference request ingress to output response delivery."
          subtext="Target SLA < 250ms"
        />

        {/* Feature Drift Score (PSI) */}
        <MetricCard
          title="Feature Drift Score (PSI)"
          value={metrics.driftScore.toFixed(3)}
          nature="observed"
          statusColor={metrics.driftScore > 0.25 ? 'critical' : metrics.driftScore > 0.1 ? 'warning' : 'good'}
          delta={{ value: '+0.042', isPositiveGood: false, isIncrease: true }}
          definition="Population Stability Index (PSI) measuring input distribution deviation vs reference baseline dataset."
          subtext="Critical threshold > 0.25"
        />

        {/* Prediction Drift Score */}
        <MetricCard
          title="Prediction Drift Score"
          value={metrics.predictionDriftScore.toFixed(3)}
          nature="observed"
          statusColor={metrics.predictionDriftScore > 0.2 ? 'warning' : 'good'}
          delta={{ value: '+0.018', isPositiveGood: false, isIncrease: true }}
          definition="Jensen-Shannon divergence measuring shifts in predicted output probabilities."
          subtext="Target < 0.150"
        />

        {/* Silent Subgroup Failures */}
        <MetricCard
          title="Silent Subgroup Disparities"
          value={metrics.silentFailuresCount}
          unit="slices"
          nature="observed"
          statusColor={metrics.silentFailuresCount > 0 ? 'critical' : 'good'}
          definition="Segments where performance drops > 15% below aggregate baseline with statistical significance (p < 0.005)."
          subtext={metrics.silentFailuresCount > 0 ? "Simpson's Paradox flagged" : 'Parity maintained'}
        />

        {/* Open Incidents */}
        <MetricCard
          title="Active Alert Incidents"
          value={metrics.openIncidentsCount}
          nature="observed"
          statusColor={metrics.openIncidentsCount > 0 ? 'warning' : 'good'}
          definition="Unresolved operational, drift, or accuracy alerts requiring MLOps investigation."
          subtext="Auto-deduplicated"
        />
      </div>

      {/* AI Reliability Radar Feature Card Banner */}
      <div className="bg-[#111827] border border-violet-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden group">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-950/50 border border-violet-500/40 rounded-lg text-cyan-400 shrink-0">
            <Radar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">Multi-Axis AI Reliability Radar</span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-violet-500/10 text-cyan-300 border border-violet-500/30">
                4-Axis Audit
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Simultaneously inspect model performance, covariate drift, inference error rates, and hidden subgroup risk on dedicated interactive radar.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('reliability-radar')}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-cyan-500/40 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0 shadow-xs active:scale-[0.98]"
        >
          <span>Open Full Radar View</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Transparent Reliability Score Decomposition Modal */}
      {showReliabilityBreakdown && (
        <div className="bg-[#0E131F] border border-amber-500/40 rounded-xl p-5 shadow-2xl animate-in fade-in duration-200 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Transparent AI Reliability Score Methodology
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Composite weighted operational index calculated across 5 deterministic telemetry pillars.
              </p>
            </div>
            <button
              onClick={() => setShowReliabilityBreakdown(false)}
              className="text-xs text-slate-400 hover:text-white px-3 py-1 bg-slate-900 border border-slate-800 rounded-md transition-colors"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {reliability.components.map((comp) => (
              <div
                key={comp.name}
                className="bg-slate-900/60 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-200 truncate">{comp.name}</span>
                    <span className="font-mono text-amber-400 font-semibold">{(comp.weight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white my-1">
                    {comp.score}
                    <span className="text-xs text-slate-400 font-normal"> / 100</span>
                  </div>
                  <div className="text-[11px] font-mono text-cyan-400 mt-1">
                    {comp.observedValue}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                  {comp.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: Reliability Score & Accuracy Over Time */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all duration-200 shadow-sm min-w-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-semibold text-white">
                  Reliability &amp; Ground Truth Accuracy Trend
                </h4>
                {metrics.streamMode === 'simulated_stream' ? (
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-purple-950/60 text-purple-300 border border-purple-800 font-semibold">
                    SIMULATED STREAM
                  </span>
                ) : (
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 border border-emerald-800 font-semibold">
                    LIVE PROD
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Rolling {timeRange} evaluation window ({timeSeries.length} time buckets)
              </p>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2.5 h-0.5 bg-amber-400 inline-block" /> Reliability
              </span>
              {hasAnyGroundTruth ? (
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" /> Accuracy
                </span>
              ) : (
                <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800 px-1.5 py-0.5 rounded">
                  Waiting for ground-truth labels
                </span>
              )}
            </div>
          </div>

          <div className="h-64 w-full min-h-[250px] min-w-0">
            {timeSeries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                No telemetry time-series recorded yet. Waiting for events...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="relGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#334155" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 100]} stroke="#334155" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '11px',
                    }}
                    labelFormatter={(label) => `Time: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="reliability"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#relGrad)"
                    name="Reliability Score"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#accGrad)"
                    name="Accuracy (%)"
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Verified Ground-Truth Samples: <strong className="text-cyan-400">{totalVerifiedInWindow}</strong> in window</span>
            <span>Freshness: <strong className="text-emerald-400">{metrics.lastEventTimestamp ? new Date(metrics.lastEventTimestamp).toLocaleTimeString() : 'Live'}</strong></span>
          </div>
        </div>

        {/* Chart 2: Inference Volume & P95 Latency */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all duration-200 shadow-sm min-w-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-semibold text-white">
                  Inference Traffic &amp; Latency P95
                </h4>
                <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-semibold">
                  Nearest-Rank P95
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Throughput (events/bucket) mapped against empirical latency
              </p>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" /> Volume (req)
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> P95 (ms)
              </span>
            </div>
          </div>

          <div className="h-64 w-full min-h-[250px] min-w-0">
            {timeSeries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 font-mono">
                No latency records in active window.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#334155" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis yAxisId="left" stroke="#334155" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fontSize: 10, fill: '#34d399' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '11px',
                    }}
                    formatter={(value: any, name: any) => {
                      if (name === 'P95 Latency (ms)') {
                        if (value === null || value === undefined) return ['No events in bucket', name];
                        return [`${value} ms`, name];
                      }
                      if (name === 'Traffic Volume') {
                        return [`${value} req`, name];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Time: ${label}`}
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="volume"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#volGrad)"
                    name="Traffic Volume"
                    isAnimationActive={false}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="latencyP95"
                    stroke="#10b981"
                    strokeWidth={1.5}
                    fillOpacity={0}
                    name="P95 Latency (ms)"
                    connectNulls={true}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Real-time Ingestion: <strong className="text-emerald-400">{isLiveConnected ? 'Connected (SSE Stream)' : 'Reconnecting...'}</strong></span>
            <span>Total Buffer: <strong className="text-cyan-400">{metrics.predictionVolume}</strong> events evaluated</span>
          </div>
        </div>
      </div>

      {/* Chart 3: Subgroup Disparity vs Global Baseline */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all duration-200 shadow-sm min-w-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-white">
                Segment Performance Disparity vs Global Baseline
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold">
                Simpson's Paradox Detector
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Comparing observed accuracy across demographic and context slices vs global expectation (with sample counts &amp; Wilson 95% CIs)
            </p>
          </div>
          <button
            onClick={() => onNavigate('subgroups')}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 shrink-0 transition-colors"
          >
            <span>Deep Subgroup Matrix ({activeSubgroups.length} Slices)</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {subgroupChartData.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center p-6 bg-slate-900/40 border border-slate-800 rounded-lg text-center">
            <AlertCircle className="w-6 h-6 text-amber-400 mb-2" />
            <span className="text-xs font-semibold text-slate-200">Awaiting Labelled Subgroup Verification Data</span>
            <p className="text-[11px] text-slate-400 max-w-md mt-1 leading-relaxed">
              Subgroup disparity evaluation requires ground-truth labels for demographic slices. Ingest events containing both <code className="text-amber-400">groundTruth</code> and <code className="text-amber-400">segments</code> attributes to populate the disparity radar.
            </p>
          </div>
        ) : (
          <div className="h-64 w-full min-h-[250px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subgroupChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#334155"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  interval={0}
                  angle={-10}
                  textAnchor="end"
                />
                <YAxis domain={[40, 100]} stroke="#334155" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '11px',
                  }}
                  formatter={(value: any, name: any, item: any) => {
                    const p = item.payload;
                    if (name === 'Observed Segment Accuracy (%)') {
                      return [
                        `${value}% (Wilson 95% CI: [${p.ciLower}% - ${p.ciUpper}%], N=${p.sampleCount})`,
                        p.isSilentFailure ? '🚨 Silent Failure Accuracy' : name,
                      ];
                    }
                    return [`${value}%`, name];
                  }}
                  labelFormatter={(_label, payload) => {
                    if (payload && payload[0]) {
                      const p = payload[0].payload;
                      return `Segment Slice: ${p.fullName} (Sample Count: N=${p.sampleCount})`;
                    }
                    return _label;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: '#94a3b8' }} />
                <Bar
                  dataKey="baseline"
                  fill="#334155"
                  name="Global Baseline Target (%)"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="accuracy"
                  name="Observed Segment Accuracy (%)"
                  fill="#06b6d4"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>
            {silentFailures.length > 0 ? (
              <span className="text-rose-400 font-bold">
                🚨 {silentFailures.length} silent subgroup failure(s) detected (Relative drop &gt; 15%, p &lt; 0.005)
              </span>
            ) : (
              <span className="text-emerald-400">All evaluated slices within statistical tolerance.</span>
            )}
          </span>
          <span>Sample size (N) indicated in parenthesis per slice</span>
        </div>
      </div>
    </div>
  );
};
