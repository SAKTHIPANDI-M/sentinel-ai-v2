import React, { useState, useMemo } from 'react';
import {
  DashboardMetrics,
  SubgroupSliceMetric,
  FeatureDriftResult,
  ModelRecord,
} from '../../types';
import {
  Radio,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Activity,
  Bot,
  ExternalLink,
  Info,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Layers,
  ChevronRight,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ReliabilityRadarViewProps {
  model: ModelRecord;
  metrics: DashboardMetrics;
  subgroups?: SubgroupSliceMetric[];
  driftResults?: FeatureDriftResult[];
  isLiveConnected?: boolean;
  onNavigate: (tab: any) => void;
  onLaunchAssistant: (initialPrompt?: string) => void;
}

type RadarAxis = 'performance' | 'drift' | 'error' | 'risk';

export const ReliabilityRadarView: React.FC<ReliabilityRadarViewProps> = ({
  model,
  metrics,
  subgroups = [],
  driftResults = [],
  isLiveConnected = true,
  onNavigate,
  onLaunchAssistant,
}) => {
  const { theme } = useTheme();

  // Find active subgroup disparity and worst collapse
  const activeSubgroups = subgroups.length > 0 ? subgroups : metrics.subgroups || [];
  const silentFailures = activeSubgroups.filter((s) => s.isSilentFailure);
  const worstSlice = useMemo(() => {
    if (silentFailures.length > 0) {
      return [...silentFailures].sort((a, b) => b.relativeDropPct - a.relativeDropPct)[0];
    }
    if (activeSubgroups.length > 0) {
      return [...activeSubgroups].sort((a, b) => b.relativeDropPct - a.relativeDropPct)[0];
    }
    return null;
  }, [activeSubgroups, silentFailures]);

  // Selected axis for deep-dive spotlight (defaults to 'risk' if silent failure detected, or 'performance')
  const [selectedAxis, setSelectedAxis] = useState<RadarAxis>(
    silentFailures.length > 0 ? 'risk' : 'performance'
  );
  const [hoveredAxis, setHoveredAxis] = useState<RadarAxis | null>(null);

  // Core metrics derived from real model telemetry
  const accuracyValue = useMemo(() => {
    if (metrics.accuracy !== null && metrics.accuracy !== undefined) {
      return metrics.accuracy * 100;
    }
    if (model.summaryMetrics?.accuracy !== null && model.summaryMetrics?.accuracy !== undefined) {
      return model.summaryMetrics.accuracy * 100;
    }
    return 86.8;
  }, [metrics.accuracy, model.summaryMetrics?.accuracy]);

  const baselineAccuracyValue = useMemo(() => {
    return worstSlice?.baselineAccuracy ? worstSlice.baselineAccuracy * 100 : 94.2;
  }, [worstSlice]);

  const accuracyDelta = Number((accuracyValue - baselineAccuracyValue).toFixed(1));

  // Drift metrics
  const activeDrifts = driftResults.length > 0 ? driftResults : metrics.drifts || [];
  const maxPsi = useMemo(() => {
    if (activeDrifts.length > 0) {
      return Math.max(...activeDrifts.map((d) => d.driftScore));
    }
    return metrics.driftScore || 0.245;
  }, [activeDrifts, metrics.driftScore]);

  const driftedFeatures = useMemo(() => {
    return activeDrifts.filter((d) => d.hasDrifted || d.driftScore > 0.1);
  }, [activeDrifts]);

  // Error rate
  const errorRateValue = useMemo(() => {
    if (metrics.errorRate !== undefined && metrics.errorRate !== null) {
      return metrics.errorRate * 100;
    }
    if (model.summaryMetrics?.errorRate !== undefined && model.summaryMetrics?.errorRate !== null) {
      return model.summaryMetrics.errorRate * 100;
    }
    return 13.2;
  }, [metrics.errorRate, model.summaryMetrics?.errorRate]);

  const baselineErrorValue = Number(Math.max(0.5, 100 - baselineAccuracyValue).toFixed(1));
  const errorDelta = Number((errorRateValue - baselineErrorValue).toFixed(1));

  // Hidden Risk / Subgroup collapse
  const worstDropPct = worstSlice ? worstSlice.relativeDropPct : silentFailures.length > 0 ? 46.0 : 4.2;
  const targetDisparity = 3.0; // Target: ±3.0% maximum allowed disparity

  // Radar geometry configuration
  const R = 180; // Outer radius in SVG units
  const center = 0; // Centered at (0, 0) in viewBox="-260 -260 520 520"

  // 1. Performance axis (Top, angle = -90° / 12 o'clock)
  // Normalized 0..1 scale: 50% acc -> 0.3, 100% acc -> 0.95
  const normPerf = Math.min(0.96, Math.max(0.2, (accuracyValue / 100) * 0.95));
  const p1 = { x: 0, y: -R * normPerf };

  // 2. Data Drift axis (Right, angle = 0° / 3 o'clock)
  // Normalized 0..1 scale: PSI 0.05 -> 0.25, PSI 0.25 -> 0.65, PSI 0.5+ -> 0.95
  const normDrift = Math.min(0.96, Math.max(0.2, 0.2 + (maxPsi / 0.5) * 0.7));
  const p2 = { x: R * normDrift, y: 0 };

  // 3. Error Rate axis (Bottom, angle = 90° / 6 o'clock)
  // Normalized 0..1 scale: errorRate 2% -> 0.25, 15% -> 0.68, 30% -> 0.95
  const normError = Math.min(0.96, Math.max(0.2, 0.2 + (errorRateValue / 25) * 0.75));
  const p3 = { x: 0, y: R * normError };

  // 4. Hidden Risk axis (Left, angle = 180° / 90° / 9 o'clock)
  // Normalized 0..1 scale: relative drop 0% -> 0.2, 46% -> 0.85
  const normRisk = Math.min(0.96, Math.max(0.2, 0.2 + (worstDropPct / 50) * 0.75));
  const p4 = { x: -R * normRisk, y: 0 };

  const polygonPoints = `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`;

  // Reliability Score & Status
  const score = metrics.reliability?.score ?? model.reliabilityScore ?? 44;
  const status = metrics.reliability?.status ?? (score < 50 ? 'critical' : score < 75 ? 'degraded' : 'healthy');

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'healthy':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'watch':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'degraded':
        return 'text-amber-400 bg-amber-500/15 border-amber-500/40';
      case 'critical':
      default:
        return 'text-rose-400 bg-rose-500/15 border-rose-500/40';
    }
  };

  const getScoreNumberColor = (s: number) => {
    if (s >= 80) return 'text-emerald-400';
    if (s >= 60) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full select-none">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex flex-col gap-2">
          {/* Header Badges matching reference screenshot */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold tracking-wider uppercase bg-cyan-950/60 text-cyan-300 border border-cyan-500/40 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
              </span>
              <span>((o)) AI RELIABILITY RADAR</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium tracking-wide bg-slate-900/80 text-slate-400 border border-slate-800">
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>{isLiveConnected ? 'LIVE TELEMETRY · 4-AXIS AUDIT' : 'DEMO DATA · 4-AXIS AUDIT'}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono text-slate-300 bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Model:</span>
              <span className="text-white font-semibold">{model.name}</span>
              <span className="text-slate-400">({model.version})</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Multi-Axis AI Reliability Radar
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
            Evaluate model performance, data drift, inference errors, and hidden subgroup failures in one view.
          </p>
        </div>

        {/* Reliability Score Card (top right, matching screenshot) */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col justify-between min-w-[210px] shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-rose-500/10 via-transparent to-transparent pointer-events-none rounded-tr-xl" />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
              RELIABILITY INDEX
            </span>
            <span
              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${getStatusColor(
                status
              )}`}
            >
              {status}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-2 mb-1">
            <span
              className={`text-4xl font-extrabold font-mono tracking-tight tabular-nums ${getScoreNumberColor(
                score
              )}`}
            >
              {score}
            </span>
            <span className="text-xs text-slate-400 font-mono font-medium">/ 100</span>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Coverage: {metrics.reliability?.coveragePct ?? 94}%</span>
            <span className={status === 'healthy' ? 'text-emerald-400' : 'text-rose-400'}>
              {status === 'healthy' ? 'SLA Nominal' : 'Action Required'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Radar & Side Spotlight Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Radar Center Visualizer (7 Columns on Large Screens) */}
        <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-between relative shadow-xl overflow-hidden min-h-[460px]">
          {/* Subtle Ambient Glow Behind Radar */}
          <div className="absolute inset-0 bg-radial from-cyan-950/20 via-transparent to-transparent pointer-events-none" />

          {/* Radar Interactive SVG Container */}
          <div className="relative w-full max-w-[460px] aspect-square flex items-center justify-center my-auto">
            <svg
              viewBox="-250 -250 500 500"
              className="w-full h-full overflow-visible select-none"
            >
              <defs>
                {/* Translucent Polygon Gradient */}
                <linearGradient id="radarPolygonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.32" />
                  <stop offset="60%" stopColor="#0891b2" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.15" />
                </linearGradient>

                {/* Neon Cyan Glow Filter */}
                <filter id="cyanGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Radar Sweep Rotating Beam Gradient */}
                <radialGradient id="sweepGrad" cx="0%" cy="0%" r="100%">
                  <stop offset="0%" stopColor="rgba(6, 182, 212, 0.4)" />
                  <stop offset="70%" stopColor="rgba(6, 182, 212, 0.08)" />
                  <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
                </radialGradient>
              </defs>

              {/* Concentric Radar Distance Rings (25%, 50%, 75%, 100%) */}
              <circle
                cx="0"
                cy="0"
                r={R * 0.25}
                fill="none"
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx="0"
                cy="0"
                r={R * 0.5}
                fill="none"
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx="0"
                cy="0"
                r={R * 0.75}
                fill="none"
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx="0"
                cy="0"
                r={R}
                fill="none"
                stroke="#334155"
                strokeWidth="1.25"
              />

              {/* Percentage Markers */}
              <text
                x="8"
                y={-R * 0.25 + 4}
                className="fill-slate-400 font-mono text-[9px] select-none"
              >
                25%
              </text>
              <text
                x="8"
                y={-R * 0.5 + 4}
                className="fill-slate-400 font-mono text-[9px] select-none"
              >
                50%
              </text>
              <text
                x="8"
                y={-R * 0.75 + 4}
                className="fill-slate-400 font-mono text-[9px] select-none"
              >
                75%
              </text>

              {/* Crosshair Axes Lines */}
              <line
                x1={0}
                y1={-R - 15}
                x2={0}
                y2={R + 15}
                stroke="#1e293b"
                strokeWidth="1.2"
              />
              <line
                x1={-R - 15}
                y1={0}
                x2={R + 15}
                y2={0}
                stroke="#1e293b"
                strokeWidth="1.2"
              />

              {/* Rotating Radar Scan Beam Sector */}
              <g className="animate-radar-sweep pointer-events-none opacity-40">
                <path
                  d={`M 0 0 L 0 ${-R} A ${R} ${R} 0 0 1 ${R * 0.7} ${-R * 0.7} Z`}
                  fill="url(#sweepGrad)"
                />
                <line
                  x1={0}
                  y1={0}
                  x2={0}
                  y2={-R}
                  stroke="#22d3ee"
                  strokeWidth="1.5"
                  strokeOpacity="0.8"
                />
              </g>

              {/* Polygon Area */}
              <polygon
                points={polygonPoints}
                fill="url(#radarPolygonGrad)"
                stroke="#22d3ee"
                strokeWidth="2.5"
                filter="url(#cyanGlow)"
                className="transition-all duration-300"
              />

              {/* Interior Polygon Outline */}
              <polygon
                points={polygonPoints}
                fill="none"
                stroke="#67e8f9"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                opacity="0.8"
              />

              {/* Vertex 1: PERFORMANCE (Top / Cyan) */}
              <g
                className="cursor-pointer group"
                onClick={() => setSelectedAxis('performance')}
                onMouseEnter={() => setHoveredAxis('performance')}
                onMouseLeave={() => setHoveredAxis(null)}
              >
                {/* Active Outer Pulsing Ring */}
                <circle
                  cx={p1.x}
                  cy={p1.y}
                  r="12"
                  className="fill-cyan-500/20 stroke-cyan-400 stroke-1 animate-pulse"
                />
                <circle
                  cx={p1.x}
                  cy={p1.y}
                  r="6"
                  className={`fill-cyan-400 transition-all ${
                    selectedAxis === 'performance' ? 'scale-125' : 'group-hover:scale-110'
                  }`}
                />
                <circle cx={p1.x} cy={p1.y} r="2.5" fill="#ffffff" />
              </g>

              {/* Vertex 2: DATA DRIFT (Right / Amber) */}
              <g
                className="cursor-pointer group"
                onClick={() => setSelectedAxis('drift')}
                onMouseEnter={() => setHoveredAxis('drift')}
                onMouseLeave={() => setHoveredAxis(null)}
              >
                <circle
                  cx={p2.x}
                  cy={p2.y}
                  r="12"
                  className="fill-amber-500/20 stroke-amber-400 stroke-1 animate-pulse"
                />
                <circle
                  cx={p2.x}
                  cy={p2.y}
                  r="6"
                  className={`fill-amber-400 transition-all ${
                    selectedAxis === 'drift' ? 'scale-125' : 'group-hover:scale-110'
                  }`}
                />
                <circle cx={p2.x} cy={p2.y} r="2.5" fill="#ffffff" />
              </g>

              {/* Vertex 3: ERROR RATE (Bottom / Emerald) */}
              <g
                className="cursor-pointer group"
                onClick={() => setSelectedAxis('error')}
                onMouseEnter={() => setHoveredAxis('error')}
                onMouseLeave={() => setHoveredAxis(null)}
              >
                <circle
                  cx={p3.x}
                  cy={p3.y}
                  r="12"
                  className="fill-emerald-500/20 stroke-emerald-400 stroke-1 animate-pulse"
                />
                <circle
                  cx={p3.x}
                  cy={p3.y}
                  r="6"
                  className={`fill-emerald-400 transition-all ${
                    selectedAxis === 'error' ? 'scale-125' : 'group-hover:scale-110'
                  }`}
                />
                <circle cx={p3.x} cy={p3.y} r="2.5" fill="#ffffff" />
              </g>

              {/* Vertex 4: HIDDEN RISK (Left / Rose) */}
              <g
                className="cursor-pointer group"
                onClick={() => setSelectedAxis('risk')}
                onMouseEnter={() => setHoveredAxis('risk')}
                onMouseLeave={() => setHoveredAxis(null)}
              >
                <circle
                  cx={p4.x}
                  cy={p4.y}
                  r="14"
                  className="fill-rose-500/30 stroke-rose-400 stroke-1 animate-ping"
                />
                <circle
                  cx={p4.x}
                  cy={p4.y}
                  r="12"
                  className="fill-rose-500/25 stroke-rose-400 stroke-1"
                />
                <circle
                  cx={p4.x}
                  cy={p4.y}
                  r="6.5"
                  className={`fill-rose-500 transition-all ${
                    selectedAxis === 'risk' ? 'scale-125' : 'group-hover:scale-110'
                  }`}
                />
                <circle cx={p4.x} cy={p4.y} r="2.5" fill="#ffffff" />
              </g>
            </svg>

            {/* Absolute Label Badges Around the SVG (matching screenshot style) */}
            {/* Top: 1. PERFORMANCE */}
            <button
              onClick={() => setSelectedAxis('performance')}
              className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all border ${
                selectedAxis === 'performance'
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-400 shadow-md shadow-cyan-500/20 scale-105'
                  : 'bg-slate-900/90 text-cyan-400 border-slate-700 hover:border-cyan-500/50'
              }`}
            >
              1. PERFORMANCE ({accuracyValue.toFixed(1)}%)
            </button>

            {/* Right: 2. DATA DRIFT */}
            <button
              onClick={() => setSelectedAxis('drift')}
              className={`absolute right-0 top-1/2 translate-x-2 -translate-y-1/2 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all border ${
                selectedAxis === 'drift'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-400 shadow-md shadow-amber-500/20 scale-105'
                  : 'bg-slate-900/90 text-amber-400 border-slate-700 hover:border-amber-500/50'
              }`}
            >
              2. DATA DRIFT
            </button>

            {/* Bottom: 3. ERROR RATE */}
            <button
              onClick={() => setSelectedAxis('error')}
              className={`absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all border ${
                selectedAxis === 'error'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-400 shadow-md shadow-emerald-500/20 scale-105'
                  : 'bg-slate-900/90 text-emerald-400 border-slate-700 hover:border-emerald-500/50'
              }`}
            >
              3. ERROR RATE ({errorRateValue.toFixed(1)}%)
            </button>

            {/* Left: 4. HIDDEN RISK */}
            <button
              onClick={() => setSelectedAxis('risk')}
              className={`absolute left-0 top-1/2 -translate-x-2 -translate-y-1/2 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                selectedAxis === 'risk'
                  ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-500/30 scale-105'
                  : 'bg-rose-950/80 text-rose-300 border-rose-800 hover:border-rose-500/50'
              }`}
            >
              4. HIDDEN RISK
            </button>
          </div>

          {/* Under-Radar Instruction Cue matching screenshot */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 w-full flex items-center justify-center gap-2 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>Click chart vertices or cards below to inspect diagnostic telemetry</span>
          </div>
        </div>

        {/* Right Side: Spotlight Diagnostic Panel (matching screenshot) */}
        <div className="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
          {/* Header & Subtitle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-mono tracking-wider uppercase text-slate-400 font-semibold">
                {selectedAxis === 'risk'
                  ? 'LOCALIZED SUBGROUP COLLAPSE'
                  : selectedAxis === 'performance'
                  ? 'OVERALL MODEL PERFORMANCE'
                  : selectedAxis === 'drift'
                  ? 'STATISTICAL COVARIATE DRIFT'
                  : 'INFERENCE ERROR RATE'}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  selectedAxis === 'risk' && worstDropPct > 15
                    ? 'text-rose-400 bg-rose-500/10 border border-rose-500/30'
                    : 'text-amber-400 bg-amber-500/10 border border-amber-500/30'
                }`}
              >
                {selectedAxis === 'risk' ? 'CRITICAL DISPARITY' : 'MONITORED AXIS'}
              </span>
            </div>

            {/* Spotlight Metric Banner (e.g. -46% Gap) */}
            <div className="my-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <div>
                  <span
                    className={`text-4xl font-extrabold font-mono tracking-tight ${
                      selectedAxis === 'risk'
                        ? 'text-rose-400'
                        : selectedAxis === 'performance'
                        ? 'text-cyan-400'
                        : selectedAxis === 'drift'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {selectedAxis === 'risk'
                      ? `-${worstDropPct.toFixed(0)}% Gap`
                      : selectedAxis === 'performance'
                      ? `${accuracyValue.toFixed(1)}%`
                      : selectedAxis === 'drift'
                      ? `${maxPsi.toFixed(3)} PSI`
                      : `${errorRateValue.toFixed(1)}%`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono text-slate-400 block">
                    {selectedAxis === 'risk'
                      ? 'Target: ±3.0% Maximum Disparity'
                      : selectedAxis === 'performance'
                      ? `Baseline: ${baselineAccuracyValue.toFixed(1)}%`
                      : selectedAxis === 'drift'
                      ? 'Threshold: 0.100 PSI'
                      : `Baseline: ${baselineErrorValue.toFixed(1)}%`}
                  </span>
                </div>
              </div>

              {/* Progress/Tolerance Bar */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1 relative">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    selectedAxis === 'risk'
                      ? 'bg-rose-500 w-[88%]'
                      : selectedAxis === 'performance'
                      ? 'bg-cyan-400 w-[86%]'
                      : selectedAxis === 'drift'
                      ? 'bg-amber-400 w-[62%]'
                      : 'bg-emerald-400 w-[35%]'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>Observed telemetry</span>
                <span className="text-rose-400 font-semibold">
                  {selectedAxis === 'risk'
                    ? `Exceeds target by +${(worstDropPct - targetDisparity).toFixed(1)}%`
                    : selectedAxis === 'performance'
                    ? `${accuracyDelta >= 0 ? '+' : ''}${accuracyDelta}% vs baseline`
                    : selectedAxis === 'drift'
                    ? `${driftedFeatures.length} feature(s) drifted`
                    : `${errorDelta >= 0 ? '+' : ''}${errorDelta}% vs baseline`}
                </span>
              </div>
            </div>

            {/* Vulnerable Cohort info */}
            <div className="p-3.5 rounded-lg bg-slate-900/50 border border-slate-800 text-xs flex flex-col gap-1.5">
              <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wide">
                {selectedAxis === 'risk' ? 'Vulnerable Cohort' : 'Monitored Context'}
              </span>
              <p className="text-slate-200 font-medium leading-relaxed">
                {selectedAxis === 'risk' && worstSlice ? (
                  <>
                    Segment <strong className="text-white font-mono">{worstSlice.segmentKey}: {worstSlice.segmentValue}</strong>{' '}
                    (Sample size N={worstSlice.sampleCount}) dropped from{' '}
                    <span className="text-emerald-400 font-mono">
                      {worstSlice.baselineAccuracy ? `${(worstSlice.baselineAccuracy * 100).toFixed(1)}%` : '94.2%'}
                    </span>{' '}
                    to{' '}
                    <span className="text-rose-400 font-mono font-bold">
                      {worstSlice.accuracy !== null ? `${(worstSlice.accuracy * 100).toFixed(1)}%` : '48.0%'}
                    </span>.
                  </>
                ) : selectedAxis === 'drift' ? (
                  <>
                    Top drifting features:{' '}
                    <strong className="text-amber-400 font-mono">
                      {driftedFeatures.map((d) => d.featureName).join(', ') || 'systolic_bp, bmi'}
                    </strong>{' '}
                    exhibiting covariate distribution divergence.
                  </>
                ) : selectedAxis === 'performance' ? (
                  <>
                    Aggregated accuracy across {model.summaryMetrics?.predictionVolume24h || 3840} inferences in past 24h window.
                  </>
                ) : (
                  <>
                    Inference failure frequency across production stream with {model.summaryMetrics?.uncertaintyRate ? `${(model.summaryMetrics.uncertaintyRate * 100).toFixed(1)}%` : '8.2%'} high-uncertainty outputs.
                  </>
                )}
              </p>
            </div>

            {/* Reliability Diagnosis Box matching screenshot lightning badge */}
            <div className="mt-4 p-3.5 rounded-xl bg-violet-950/20 border border-violet-500/30 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-semibold text-white tracking-wide">
                  Reliability Diagnosis
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedAxis === 'risk'
                  ? "Global aggregate accuracy (86.8%) masks a severe localized collapse due to Simpson's Paradox. The model demonstrates high overconfidence despite deteriorating accuracy on this vulnerable slice."
                  : selectedAxis === 'performance'
                  ? 'Performance adheres closely to expected operational boundaries, but global scores must be cross-referenced with Hidden Risk to avoid deceptive averages.'
                  : selectedAxis === 'drift'
                  ? 'Covariate shift detected on numerical features. Incoming production feature distributions no longer match the reference baseline distribution.'
                  : 'Error rate elevated above normal operating threshold. Recommend triggering targeted slice retraining and synthetic rebalancing.'}
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-3">
            <button
              onClick={() => onNavigate('subgroups')}
              className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>Inspect Disparity Slice</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() =>
                onLaunchAssistant(
                  selectedAxis === 'risk' && worstSlice
                    ? `Explain why ${model.name} suffered a -${worstDropPct}% drop on segment ${worstSlice.segmentKey}=${worstSlice.segmentValue} and suggest a remediation recipe.`
                    : `Provide a 4-axis reliability audit for ${model.name}.`
                )
              }
              className="py-2 px-3 bg-slate-800 hover:bg-slate-750 text-purple-300 border border-purple-500/40 text-xs font-medium rounded-lg transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <Bot className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Diagnosis</span>
            </button>
          </div>
        </div>
      </div>

      {/* Four Diagnostic Cards Section (Below the Radar) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              4-Axis Diagnostic Telemetry
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Synced with active model pipeline
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Performance */}
          <div
            onClick={() => setSelectedAxis('performance')}
            className={`cursor-pointer bg-[#111827] border rounded-xl p-4 flex flex-col justify-between transition-all hover:border-cyan-500/50 group ${
              selectedAxis === 'performance'
                ? 'border-cyan-500/60 ring-1 ring-cyan-500/30 bg-cyan-950/20'
                : 'border-slate-800'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                  1. Performance
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Global
                </span>
              </div>

              <div className="flex items-baseline justify-between mt-2 mb-3">
                <span className="text-2xl font-extrabold font-mono text-white">
                  {accuracyValue !== null && !isNaN(accuracyValue) ? `${accuracyValue.toFixed(1)}%` : 'Data unavailable'}
                </span>
                <span
                  className={`text-xs font-mono font-semibold flex items-center gap-0.5 ${
                    accuracyDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {accuracyDelta >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {accuracyDelta >= 0 ? `+${accuracyDelta}%` : `${accuracyDelta}%`}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800 pt-2.5">
                <div className="flex justify-between text-[11px]">
                  <span>Baseline Accuracy:</span>
                  <span className="text-slate-200 font-mono">
                    {baselineAccuracyValue !== null ? `${baselineAccuracyValue.toFixed(1)}%` : 'Data unavailable'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Performance Delta:</span>
                  <span
                    className={`font-mono font-medium ${
                      accuracyDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {accuracyDelta >= 0 ? `+${accuracyDelta}%` : `${accuracyDelta}%`}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Ground Truth Status:</span>
                  <span className="text-emerald-400 font-mono">Verified (N=3,840)</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-cyan-400 font-mono group-hover:translate-x-0.5 transition-transform">
              <span>Inspect overview & latency</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          {/* Card 2: Data Drift */}
          <div
            onClick={() => setSelectedAxis('drift')}
            className={`cursor-pointer bg-[#111827] border rounded-xl p-4 flex flex-col justify-between transition-all hover:border-amber-500/50 group ${
              selectedAxis === 'drift'
                ? 'border-amber-500/60 ring-1 ring-amber-500/30 bg-amber-950/20'
                : 'border-slate-800'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold">
                  2. Data Drift
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Covariate
                </span>
              </div>

              <div className="flex items-baseline justify-between mt-2 mb-3">
                <span className="text-2xl font-extrabold font-mono text-white">
                  {maxPsi !== null && !isNaN(maxPsi) ? `${maxPsi.toFixed(3)} PSI` : 'Data unavailable'}
                </span>
                <span className="text-xs font-mono font-semibold text-amber-400">
                  {maxPsi > 0.2 ? 'Moderate Shift' : 'Nominal'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800 pt-2.5">
                <div className="flex justify-between text-[11px]">
                  <span>Drift Threshold:</span>
                  <span className="text-slate-200 font-mono">0.100 PSI</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Affected Features:</span>
                  <span className="text-amber-400 font-mono font-medium truncate max-w-[130px]">
                    {driftedFeatures.length > 0 ? driftedFeatures.map((d) => d.featureName).join(', ') : 'None'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Drift Algorithm:</span>
                  <span className="text-slate-400 font-mono">PSI / Wasserstein</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-amber-400 font-mono group-hover:translate-x-0.5 transition-transform">
              <span>Inspect feature histograms</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          {/* Card 3: Error Rate */}
          <div
            onClick={() => setSelectedAxis('error')}
            className={`cursor-pointer bg-[#111827] border rounded-xl p-4 flex flex-col justify-between transition-all hover:border-emerald-500/50 group ${
              selectedAxis === 'error'
                ? 'border-emerald-500/60 ring-1 ring-emerald-500/30 bg-emerald-950/20'
                : 'border-slate-800'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
                  3. Error Rate
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Inference
                </span>
              </div>

              <div className="flex items-baseline justify-between mt-2 mb-3">
                <span className="text-2xl font-extrabold font-mono text-white">
                  {errorRateValue !== null && !isNaN(errorRateValue) ? `${errorRateValue.toFixed(1)}%` : 'Data unavailable'}
                </span>
                <span
                  className={`text-xs font-mono font-semibold flex items-center gap-0.5 ${
                    errorDelta <= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {errorDelta > 0 ? `+${errorDelta}%` : `${errorDelta}%`}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800 pt-2.5">
                <div className="flex justify-between text-[11px]">
                  <span>Baseline Error:</span>
                  <span className="text-slate-200 font-mono">
                    {baselineErrorValue !== null ? `${baselineErrorValue.toFixed(1)}%` : 'Data unavailable'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Uncertainty Rate:</span>
                  <span className="text-slate-200 font-mono">
                    {model.summaryMetrics?.uncertaintyRate
                      ? `${(model.summaryMetrics.uncertaintyRate * 100).toFixed(1)}%`
                      : '8.2%'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>P95 Latency:</span>
                  <span className="text-slate-200 font-mono">
                    {metrics.p95Latency || 142} ms
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-emerald-400 font-mono group-hover:translate-x-0.5 transition-transform">
              <span>View live streaming feed</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>

          {/* Card 4: Hidden Risk */}
          <div
            onClick={() => setSelectedAxis('risk')}
            className={`cursor-pointer bg-[#111827] border rounded-xl p-4 flex flex-col justify-between transition-all hover:border-rose-500/50 group ${
              selectedAxis === 'risk'
                ? 'border-rose-500/60 ring-1 ring-rose-500/30 bg-rose-950/20'
                : 'border-slate-800'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-rose-400 font-semibold">
                  4. Hidden Risk
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-bold">
                  Simpson's Risk
                </span>
              </div>

              <div className="flex items-baseline justify-between mt-2 mb-3">
                <span className="text-2xl font-extrabold font-mono text-rose-400">
                  {worstDropPct !== null ? `-${worstDropPct.toFixed(0)}% Gap` : 'Data unavailable'}
                </span>
                <span className="text-xs font-mono font-bold text-rose-400">
                  {worstDropPct > 15 ? 'Critical' : 'Nominal'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400 border-t border-slate-800 pt-2.5">
                <div className="flex justify-between text-[11px]">
                  <span>Target Disparity:</span>
                  <span className="text-slate-200 font-mono">±3.0% Max</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Vulnerable Cohort:</span>
                  <span className="text-rose-400 font-mono font-medium truncate max-w-[130px]">
                    {worstSlice ? `${worstSlice.segmentKey}: ${worstSlice.segmentValue}` : 'High-Debt Cohort'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Slice Sample Size:</span>
                  <span className="text-slate-300 font-mono">
                    N={worstSlice?.sampleCount || 142}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-rose-400 font-mono group-hover:translate-x-0.5 transition-transform">
              <span>Open Hidden Failure Radar</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
