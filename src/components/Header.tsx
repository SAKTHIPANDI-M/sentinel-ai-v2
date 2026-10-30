import React from 'react';
import { ModelRecord } from '../types';
import {
  ShieldAlert,
  Radio,
  Zap,
  Plus,
  RefreshCw,
  Layers,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ModelSelector } from './ModelSelector';
import { DatasetSelector } from './DatasetSelector';

interface HeaderProps {
  models: ModelRecord[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  environment: string;
  onEnvironmentChange: (env: any) => void;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  isLiveConnected: boolean;
  onOpenNewModelModal: () => void;
  onTriggerAnomaly: (type: 'silent_failure' | 'drift_surge') => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  totalEventsReceived?: number;
  eventsPerSecond?: number;
  lastEventTimestamp?: string;
  streamMode?: 'live_external' | 'simulated_stream';
}

export const Header: React.FC<HeaderProps> = ({
  models,
  selectedModelId,
  onSelectModel,
  environment,
  onEnvironmentChange,
  timeRange,
  onTimeRangeChange,
  isLiveConnected,
  onOpenNewModelModal,
  onTriggerAnomaly,
  onRefresh,
  isRefreshing,
  totalEventsReceived,
  eventsPerSecond,
  lastEventTimestamp,
  streamMode = 'simulated_stream',
}) => {
  const { theme, toggleTheme } = useTheme();
  const currentModel = models.find((m) => m.id === selectedModelId) || models[0] || {
    id: selectedModelId || 'cardio-risk-v3.2',
    name: 'CardioRisk Neural Predictor',
    task: 'classification' as const,
    domain: 'Healthcare' as const,
    version: '3.2.0',
    description: 'Actuarial cardiovascular risk prediction model',
    owner: 'Clinical ML',
    environment: 'production' as const,
    status: 'degraded' as const,
    reliabilityScore: 64,
    deployedAt: '2026-08-14T09:30:00Z',
    referenceDataset: 'MIMIC-IV-Cardio-Validation-v2 [DEMO DATA] (N=42,500)',
    isDemo: true,
    inputSchema: {},
    outputSchema: {},
    monitoredSegments: ['age_group'],
    features: ['age'],
    endpointUrl: '',
    summaryMetrics: {
      accuracy: 0.942,
      f1Score: 0.918,
      p95LatencyMs: 142,
      errorRate: 0.008,
      predictionVolume24h: 3840,
      driftScore: 0.165,
      predictionDriftScore: 0.142,
      uncertaintyRate: 0.082,
      openIncidentsCount: 2,
    },
  };

  return (
    <header className="h-14 border-b border-slate-800 bg-[#0E131F]/90 backdrop-blur-md px-4 flex items-center justify-between gap-4 fixed top-0 left-0 right-0 z-40 transition-colors">
      {/* Zone 1: Brand, Model Selector & Dataset Selector */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base tracking-tight text-white whitespace-nowrap">
              Sentinel<span className="text-amber-400">AI</span>
            </span>
            <span className="hidden sm:inline-block text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">
              Reliability Core
            </span>
          </div>
        </div>

        <span className="text-slate-700 hidden sm:inline" aria-hidden="true">/</span>

        {/* Enhanced Multi-Domain Model Selector */}
        <ModelSelector
          models={models}
          selectedModelId={selectedModelId}
          onSelectModel={onSelectModel}
        />

        {/* Dataset Selector & Inspector Trigger */}
        <div className="hidden lg:block">
          <DatasetSelector
            model={currentModel}
            onDatasetChanged={onRefresh}
          />
        </div>
      </div>

      {/* Zone 2: Environment & Time Range Controls */}
      <div className="hidden md:flex items-center gap-2 text-xs">
        {/* Environment toggle */}
        <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
          {(['production', 'staging', 'development'] as const).map((env) => (
            <button
              key={env}
              onClick={() => onEnvironmentChange(env)}
              className={`px-2.5 py-1 text-xs rounded-md capitalize transition-all font-medium whitespace-nowrap ${
                environment === env
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {env === 'production' ? 'Prod' : env === 'staging' ? 'Stage' : 'Dev'}
            </button>
          ))}
        </div>

        {/* Time range selector */}
        <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-lg">
          {['1h', '6h', '24h', '7d', '30d'].map((r) => (
            <button
              key={r}
              onClick={() => onTimeRangeChange(r)}
              className={`px-2.5 py-1 text-xs rounded-md transition-all font-medium whitespace-nowrap ${
                timeRange === r
                  ? 'bg-slate-800 text-amber-400 border border-amber-500/30 shadow-xs font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Zone 3: Live telemetry, Anomaly trigger, Theme & Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Real-time SSE Connection Indicator with Live Counter & EPS */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isLiveConnected ? 'bg-emerald-400 opacity-75' : 'bg-slate-600 opacity-30'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isLiveConnected ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
            </span>
            <span className="text-slate-100 font-bold tabular-nums">
              {(totalEventsReceived || 0).toLocaleString()} <span className="text-slate-400 font-normal hidden sm:inline">evts</span>
            </span>
          </div>
          <span className="text-slate-700 hidden md:inline">|</span>
          <span className="text-cyan-400 tabular-nums font-semibold hidden md:inline">
            {eventsPerSecond !== undefined ? eventsPerSecond.toFixed(1) : '1.0'} <span className="text-slate-400 font-normal">EPS</span>
          </span>
          <span className="text-slate-700 hidden lg:inline">|</span>
          <span className="text-[10px] text-cyan-400 uppercase px-1.5 py-0.5 bg-cyan-950/40 border border-cyan-800/60 rounded font-semibold hidden lg:inline">
            {streamMode === 'simulated_stream' ? 'STREAM' : 'LIVE'}
          </span>
        </div>

        {/* Anomaly Burst Dropdown */}
        <div className="relative group hidden lg:block">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-rose-400 border border-rose-800/60 rounded-lg text-xs font-medium transition-all active:scale-[0.98] whitespace-nowrap shadow-xs">
            <Zap className="w-3.5 h-3.5 text-rose-400" />
            <span>Inject Anomaly</span>
          </button>
          <div className="absolute right-0 mt-1.5 w-60 bg-[#0E131F] border border-slate-800 rounded-xl shadow-2xl py-1.5 hidden group-hover:block z-50 backdrop-blur-xl">
            <button
              onClick={() => onTriggerAnomaly('silent_failure')}
              className="w-full text-left px-3.5 py-2.5 text-xs text-slate-100 hover:bg-slate-800/60 flex flex-col gap-0.5 transition-colors"
            >
              <span className="font-semibold text-rose-400">Silent Subgroup Failure</span>
              <span className="text-[11px] text-slate-400">Simulate Simpson's paradox on elderly cohort</span>
            </button>
            <button
              onClick={() => onTriggerAnomaly('drift_surge')}
              className="w-full text-left px-3.5 py-2.5 text-xs text-slate-100 hover:bg-slate-800/60 flex flex-col gap-0.5 border-t border-slate-800 transition-colors"
            >
              <span className="font-semibold text-amber-400">Extreme Velocity Drift</span>
              <span className="text-[11px] text-slate-400">Spike PSI &gt; 0.35 on cross-border traffic</span>
            </button>
          </div>
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all active:scale-[0.95]"
          title="Refresh telemetry"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
        </button>

        {/* Light/Dark Theme Changer Button */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all text-xs font-medium active:scale-[0.95]"
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline text-[11px] font-medium text-slate-200">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xl:inline text-[11px] font-medium text-slate-800">Dark</span>
            </>
          )}
        </button>

        {/* Register Model Action */}
        <button
          onClick={onOpenNewModelModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-xs active:scale-[0.98] whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Register Model</span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-mono text-[10px] font-bold shadow-xs">
            ML
          </div>
          <span className="hidden xl:inline text-xs font-semibold text-slate-300">Lead Engineer</span>
        </div>
      </div>
    </header>
  );
};
