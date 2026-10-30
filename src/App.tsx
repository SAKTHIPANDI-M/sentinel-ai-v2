import React, { useEffect, useState, useCallback } from 'react';
import {
  ModelRecord,
  DashboardMetrics,
  SubgroupSliceMetric,
  FeatureDriftResult,
  Incident,
  PredictionEvent,
} from './types';
import { api } from './api';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { OverviewView } from './components/views/OverviewView';
import { ReliabilityRadarView } from './components/views/ReliabilityRadarView';
import { SubgroupsView } from './components/views/SubgroupsView';
import { DriftView } from './components/views/DriftView';
import { LiveTelemetryView } from './components/views/LiveTelemetryView';
import { IncidentsView } from './components/views/IncidentsView';
import { ModelRegistryView } from './components/views/ModelRegistryView';
import { RegressionGuardView } from './components/views/RegressionGuardView';
import { WhatIfSimulatorView } from './components/views/WhatIfSimulatorView';
import { RootCauseAssistantView } from './components/views/RootCauseAssistantView';
import { AuditAndIntegrationsView } from './components/views/AuditAndIntegrationsView';
import { ModelModal } from './components/ModelModal';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTheme } from './context/ThemeContext';

export default function App() {
  const [models, setModels] = useState<ModelRecord[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('cardio-risk-v3.2');
  const [activeTab, setActiveTabState] = useState<NavTab>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '') as NavTab;
      const validTabs: NavTab[] = [
        'overview',
        'reliability-radar',
        'live',
        'subgroups',
        'drift',
        'incidents',
        'models',
        'regression',
        'assistant',
        'simulator',
        'integrations',
      ];
      if (validTabs.includes(hash)) return hash;
    }
    return 'overview';
  });

  const setActiveTab = useCallback((tab: NavTab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      window.location.hash = tab;
    }
  }, []);
  const [environment, setEnvironment] = useState<'production' | 'staging' | 'development'>('production');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
  const [subgroups, setSubgroups] = useState<SubgroupSliceMetric[]>([]);
  const [driftResults, setDriftResults] = useState<FeatureDriftResult[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [recentEvents, setRecentEvents] = useState<PredictionEvent[]>([]);

  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load initial Models and core metrics
  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsRefreshing(true);
      setErrorMessage(null);

      const [modelsList, metrics, subs, drifts, incs] = await Promise.all([
        api.getModels(),
        api.getDashboard(selectedModelId, timeRange),
        api.getSubgroups(selectedModelId),
        api.getDrift(selectedModelId),
        api.getIncidents(selectedModelId),
      ]);

      setModels(modelsList);
      // Ensure metrics.subgroups is populated with the verified subgroup list
      metrics.subgroups = subs && subs.length > 0 ? subs : metrics.subgroups;
      setDashboardMetrics(metrics);
      setSubgroups(subs);
      setDriftResults(drifts);
      setIncidents(incs);
      if (metrics.recentEvents && metrics.recentEvents.length > 0) {
        setRecentEvents(metrics.recentEvents);
      }
    } catch (err: any) {
      console.error('Failed to load SentinelAI telemetry data:', err);
      setErrorMessage(err.message || 'Unable to connect to monitoring service');
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedModelId, timeRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Server-Sent Events (SSE) for Real-Time Streaming Telemetry
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/v1/stream?model_id=${encodeURIComponent(selectedModelId)}`);

      eventSource.onopen = () => {
        setIsLiveConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'INFERENCE_EVENT' && data.event) {
            const newEv: PredictionEvent = data.event;
            setRecentEvents((prev) => [newEv, ...prev.slice(0, 49)]);
            setDashboardMetrics((prev) => {
              if (!prev) return prev;
              const newTotal = (prev.totalEventsReceived || 0) + 1;
              const newTimestamp = newEv.timestamp || new Date().toISOString();

              // Dynamically update the active time-series window so graphs live-update without refresh
              const updatedSeries = [...(prev.timeSeries || [])];
              if (updatedSeries.length > 0) {
                const lastIdx = updatedSeries.length - 1;
                const lastPt = { ...updatedSeries[lastIdx] };
                lastPt.volume = (lastPt.volume || 0) + 1;

                if (typeof newEv.latencyMs === 'number' && !isNaN(newEv.latencyMs)) {
                  if (lastPt.latencyP95 === null) {
                    lastPt.latencyP95 = newEv.latencyMs;
                  } else {
                    lastPt.latencyP95 = Math.round(Math.max(lastPt.latencyP95 * 0.95, newEv.latencyMs));
                  }
                }

                if (newEv.groundTruth !== null && newEv.groundTruth !== undefined && newEv.groundTruth !== '') {
                  const isMatch = String(newEv.prediction).toLowerCase() === String(newEv.groundTruth).toLowerCase();
                  const prevCount = lastPt.labeledCount || 0;
                  const prevAcc = lastPt.accuracy !== null ? lastPt.accuracy : 90;
                  const newCorrect = (prevAcc / 100) * prevCount + (isMatch ? 1 : 0);
                  lastPt.labeledCount = prevCount + 1;
                  lastPt.accuracy = Number(((newCorrect / lastPt.labeledCount) * 100).toFixed(1));
                  lastPt.hasGroundTruth = true;
                }

                updatedSeries[lastIdx] = lastPt;
              }

              return {
                ...prev,
                totalEventsReceived: newTotal,
                lastEventTimestamp: newTimestamp,
                timeSeries: updatedSeries,
                dataFreshness: new Date().toISOString(),
              };
            });
          } else if (data.type === 'ANOMALY_BURST_INJECTED' || data.type === 'INCIDENT_UPDATED') {
            loadData(true);
          }
        } catch (e) {
          console.error('SSE JSON parse error:', e);
        }
      };

      eventSource.onerror = () => {
        setIsLiveConnected(false);
      };
    } catch (e) {
      console.error('Failed to initialize SSE EventSource:', e);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [selectedModelId, loadData]);

  const handleLaunchAssistant = (prompt?: string) => {
    setAssistantPrompt(prompt);
    setActiveTab('assistant');
  };

  const handleTriggerAnomaly = async (type: 'silent_failure' | 'drift_surge') => {
    try {
      await api.injectAnomalyBurst(selectedModelId, type);
      loadData(false);
    } catch (err) {
      console.error(err);
    }
  };

  const currentModel = models.find((m) => m.id === selectedModelId) || models[0] || {
    id: 'cardio-risk-v3.2',
    name: 'CardioRisk Neural Predictor',
    task: 'classification' as const,
    domain: 'Healthcare' as const,
    version: '3.2.0',
    description: 'Atherosclerotic cardiovascular disease predictor',
    owner: 'Dr. Sarah Lin',
    environment: 'production' as const,
    status: 'degraded' as const,
    reliabilityScore: 64,
    deployedAt: '2026-08-14T09:30:00Z',
    referenceDataset: 'MIMIC-IV-Cardio',
    isDemo: false,
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

  const openIncidentsCount = incidents.filter((i) => i.status === 'open').length;
  const silentFailuresCount = subgroups.filter((s) => s.isSilentFailure).length;

  const { theme } = useTheme();

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        theme === 'dark' ? 'bg-[#0B0F17] text-slate-100' : 'bg-slate-50 text-slate-900'
      } selection:bg-amber-500/30 selection:text-amber-300`}
    >
      {/* Top Header */}
      <Header
        models={models}
        selectedModelId={selectedModelId}
        onSelectModel={(id) => {
          setSelectedModelId(id);
        }}
        environment={environment}
        onEnvironmentChange={setEnvironment}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        isLiveConnected={isLiveConnected}
        onOpenNewModelModal={() => setIsModelModalOpen(true)}
        onTriggerAnomaly={handleTriggerAnomaly}
        onRefresh={() => loadData(false)}
        isRefreshing={isRefreshing}
        totalEventsReceived={dashboardMetrics?.totalEventsReceived}
        eventsPerSecond={dashboardMetrics?.eventsPerSecond}
        lastEventTimestamp={dashboardMetrics?.lastEventTimestamp}
        streamMode={dashboardMetrics?.streamMode}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 pt-14 min-h-screen relative">
        {/* Fixed Collapsible Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          openIncidentsCount={openIncidentsCount}
          silentFailuresCount={silentFailuresCount}
          modelName={currentModel.name}
          onTriggerStressShift={() => handleTriggerAnomaly('drift_surge')}
        />

        {/* Viewport Content Canvas */}
        <main
          className={`main-dashboard-canvas flex-1 min-h-[calc(100vh-3.5rem)] overflow-y-auto overflow-x-hidden bg-[#0B0F17] transition-all duration-200 ${
            sidebarCollapsed ? 'ml-16 sidebar-collapsed' : 'ml-[230px]'
          }`}
          style={{
            marginLeft: sidebarCollapsed ? 64 : 230,
          }}
        >
          {errorMessage && (
            <div className="m-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 flex items-center justify-between text-xs shadow-md">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Error communicating with SentinelAI backend: {errorMessage}</span>
              </div>
              <button
                onClick={() => loadData(false)}
                className="px-3 py-1.5 bg-rose-900/50 hover:bg-rose-800/60 text-slate-100 font-mono rounded-lg transition-colors font-medium active:scale-[0.98] border border-rose-700"
              >
                Retry Connection
              </button>
            </div>
          )}

          {!dashboardMetrics && !errorMessage ? (
            <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400 font-mono text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
              <span>Initializing SentinelAI real-time telemetry engine...</span>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && dashboardMetrics && (
                <OverviewView
                  metrics={dashboardMetrics}
                  subgroups={subgroups.length > 0 ? subgroups : dashboardMetrics.subgroups}
                  timeRange={timeRange}
                  isLiveConnected={isLiveConnected}
                  onNavigate={setActiveTab}
                  onLaunchAssistant={handleLaunchAssistant}
                />
              )}

              {activeTab === 'reliability-radar' && dashboardMetrics && (
                <ReliabilityRadarView
                  model={currentModel}
                  metrics={dashboardMetrics}
                  subgroups={subgroups.length > 0 ? subgroups : dashboardMetrics.subgroups}
                  driftResults={driftResults.length > 0 ? driftResults : dashboardMetrics.drifts}
                  isLiveConnected={isLiveConnected}
                  onNavigate={setActiveTab}
                  onLaunchAssistant={handleLaunchAssistant}
                />
              )}

              {activeTab === 'subgroups' && (
                <SubgroupsView
                  model={currentModel}
                  subgroups={subgroups}
                  onLaunchAssistant={handleLaunchAssistant}
                  onNavigateRetraining={() => setActiveTab('regression')}
                />
              )}

              {activeTab === 'drift' && (
                <DriftView
                  model={currentModel}
                  driftResults={driftResults}
                  onLaunchAssistant={handleLaunchAssistant}
                />
              )}

              {activeTab === 'live' && (
                <LiveTelemetryView
                  model={currentModel}
                  recentEvents={recentEvents}
                  isLiveConnected={isLiveConnected}
                  onRefresh={() => loadData(true)}
                />
              )}

              {activeTab === 'incidents' && (
                <IncidentsView
                  incidents={incidents}
                  onRefresh={() => loadData(true)}
                  onLaunchAssistant={handleLaunchAssistant}
                />
              )}

              {activeTab === 'models' && (
                <ModelRegistryView
                  models={models}
                  selectedModelId={selectedModelId}
                  onSelectModel={setSelectedModelId}
                  onOpenNewModelModal={() => setIsModelModalOpen(true)}
                />
              )}

              {activeTab === 'regression' && (
                <RegressionGuardView
                  model={currentModel}
                  onLaunchAssistant={handleLaunchAssistant}
                />
              )}

              {activeTab === 'simulator' && (
                <WhatIfSimulatorView model={currentModel} />
              )}

              {activeTab === 'assistant' && (
                <RootCauseAssistantView
                  model={currentModel}
                  initialPrompt={assistantPrompt}
                />
              )}

              {activeTab === 'integrations' && (
                <AuditAndIntegrationsView model={currentModel} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Model Creation Modal */}
      <ModelModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        onModelCreated={(newModel) => {
          setModels((prev) => [...prev, newModel]);
          setSelectedModelId(newModel.id);
          loadData(false);
        }}
      />
    </div>
  );
}
