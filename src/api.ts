import {
  ModelRecord,
  DatasetRecord,
  DashboardMetrics,
  SubgroupSliceMetric,
  FeatureDriftResult,
  Incident,
  AuditLog,
  PredictionEvent,
  PublicDataFeedState,
  HiddenFailureRadarResponse,
} from './types';

export const api = {
  async getHealth(): Promise<any> {
    const res = await fetch('/api/v1/health');
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  async getModels(): Promise<ModelRecord[]> {
    const res = await fetch('/api/v1/models');
    if (!res.ok) throw new Error('Failed to fetch models');
    return res.json();
  },

  async getDashboard(modelId?: string, timeRange = '24h'): Promise<DashboardMetrics> {
    const params = new URLSearchParams();
    if (modelId && modelId !== 'all') params.set('model_id', modelId);
    params.set('time_range', timeRange);

    const url = `/api/v1/monitoring/overview?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
    const data = await res.json();

    const rawSeries = data.time_series || data.timeSeries || [];
    const timeSeries = rawSeries.map((pt: any) => ({
      time: String(pt.time || ''),
      timestamp: pt.timestamp ? String(pt.timestamp) : undefined,
      reliability: Number(pt.reliability ?? 85),
      accuracy: pt.accuracy !== null && pt.accuracy !== undefined ? Number(pt.accuracy) : null,
      latencyP95: pt.latencyP95 !== null && pt.latencyP95 !== undefined ? Number(pt.latencyP95) : null,
      volume: Number(pt.volume ?? 0),
      driftScore: Number(pt.driftScore ?? 0.05),
      labeledCount: typeof pt.labeledCount === 'number' ? pt.labeledCount : undefined,
      hasGroundTruth: Boolean(pt.hasGroundTruth),
    }));

    return {
      model: data.model,
      reliability: {
        score: Number(data.reliability_score ?? 85),
        status: data.reliability_status || 'healthy',
        coveragePct: Number(data.coverage_pct ?? 94),
        components: data.components || [],
      },
      accuracy: data.overall_accuracy !== null && data.overall_accuracy !== undefined ? Number(data.overall_accuracy) : null,
      errorRate: Number(data.error_rate ?? 0.01),
      p95Latency: Number(data.p95_latency_ms ?? 120),
      p50Latency: Number(data.p50_latency_ms ?? 60),
      p99Latency: Number(data.p99_latency_ms ?? 180),
      predictionVolume: Number(data.total_events_received ?? 0),
      driftScore: Number(data.feature_drift_score ?? 0.05),
      predictionDriftScore: Number(data.prediction_drift_score ?? 0.1),
      silentFailuresCount: Number(data.silent_failures_count ?? 0),
      openIncidentsCount: Number(data.active_incidents_count ?? 0),
      subgroups: data.subgroups || [],
      drifts: data.drifts || [],
      timeSeries,
      recentEvents: data.recent_events || data.recentEvents || [],
      totalEventsReceived: Number(data.total_events_received ?? 0),
      eventsPerSecond: Number(data.events_per_second ?? 0),
      lastEventTimestamp: data.last_event_timestamp || new Date().toISOString(),
      streamMode: data.stream_mode,
      dataFreshness: data.data_freshness || new Date().toISOString(),
    };
  },

  async getMetrics(modelId?: string, timeRange = '24h'): Promise<any> {
    const params = new URLSearchParams();
    if (modelId && modelId !== 'all') params.set('model_id', modelId);
    params.set('time_range', timeRange);

    const res = await fetch(`/api/v1/monitoring/metrics?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch metrics time series');
    return res.json();
  },

  async getSubgroups(modelId?: string): Promise<SubgroupSliceMetric[]> {
    const url = modelId ? `/api/v1/monitoring/failures?model_id=${encodeURIComponent(modelId)}` : '/api/v1/monitoring/failures';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch subgroup metrics');
    const data = await res.json();
    return data.slices || [];
  },

  async getHiddenFailureRadar(modelId?: string): Promise<HiddenFailureRadarResponse> {
    const url = modelId ? `/api/v1/monitoring/failures?model_id=${encodeURIComponent(modelId)}` : '/api/v1/monitoring/failures';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch Hidden Failure Radar');
    return res.json();
  },

  async getDrift(modelId?: string): Promise<FeatureDriftResult[]> {
    const url = modelId ? `/api/v1/monitoring/drift?model_id=${encodeURIComponent(modelId)}` : '/api/v1/monitoring/drift';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch drift metrics');
    const data = await res.json();
    return data.features || [];
  },

  async getIncidents(modelId?: string): Promise<Incident[]> {
    const url = modelId && modelId !== 'all' ? `/api/v1/incidents?model_id=${encodeURIComponent(modelId)}` : '/api/v1/incidents';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch incidents');
    return res.json();
  },

  async updateIncidentStatus(id: string, status: Incident['status'], actor = 'Lead MLOps Engineer'): Promise<Incident> {
    const res = await fetch(`/api/v1/incidents/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, actor }),
    });
    if (!res.ok) throw new Error('Failed to update incident status');
    return res.json();
  },

  async addIncidentComment(id: string, author: string, text: string): Promise<Incident> {
    const res = await fetch(`/api/v1/incidents/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, text }),
    });
    if (!res.ok) throw new Error('Failed to add incident comment');
    return res.json();
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await fetch('/api/v1/audit-logs');
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  async createModel(data: Partial<ModelRecord>): Promise<ModelRecord> {
    const res = await fetch('/api/v1/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create model');
    return res.json();
  },

  async testModelConnection(endpointUrl: string, authType = 'none', authToken = ''): Promise<any> {
    const res = await fetch('/api/v1/models/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpointUrl, authType, authToken }),
    });
    if (!res.ok) throw new Error('Connection test failed');
    return res.json();
  },

  async getPublicData(): Promise<PublicDataFeedState> {
    const res = await fetch('/api/v1/public-data');
    if (!res.ok) throw new Error('Failed to fetch public environmental telemetry');
    return res.json();
  },

  async investigate(question: string, modelId: string): Promise<{
    answer: string;
    engine: 'gemini-3.8-flash' | 'deterministic-expert';
    evidenceCount: number;
  }> {
    const res = await fetch('/api/v1/investigate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, modelId }),
    });
    if (!res.ok) throw new Error('Investigation request failed');
    return res.json();
  },

  async compareVersions(modelId: string): Promise<any> {
    const res = await fetch(`/api/v1/compare?model_id=${encodeURIComponent(modelId)}`);
    if (!res.ok) throw new Error('Failed to compare model versions');
    return res.json();
  },

  async runSimulation(payload: {
    modelId: string;
    injectedDriftPsi: number;
    subgroupErrorSpikePct: number;
    trafficSurgeFactor: number;
    latencyMultiplier: number;
  }): Promise<any> {
    const res = await fetch('/api/v1/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Simulation calculation failed');
    return res.json();
  },

  async ingestPrediction(data: Partial<PredictionEvent> | Partial<PredictionEvent>[]): Promise<any> {
    const isBatch = Array.isArray(data);
    const url = isBatch ? '/api/v1/events/batch' : '/api/v1/events';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Ingestion failed');
    }
    return res.json();
  },

  async toggleTraffic(active: boolean, speedMs?: number): Promise<any> {
    const res = await fetch('/api/traffic/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active, speedMs }),
    });
    return res.json();
  },

  async injectAnomalyBurst(modelId: string, type: 'silent_failure' | 'drift_surge'): Promise<any> {
    const res = await fetch('/api/traffic/inject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId, type }),
    });
    return res.json();
  },

  async getModelDatasets(modelId: string): Promise<DatasetRecord[]> {
    const res = await fetch(`/api/v1/models/${encodeURIComponent(modelId)}/datasets`);
    if (!res.ok) throw new Error('Failed to fetch model datasets');
    const data = await res.json();
    return data.datasets || [];
  },

  async selectDataset(modelId: string, datasetId: string): Promise<{ success: boolean; model: ModelRecord; dataset: DatasetRecord }> {
    const res = await fetch(`/api/v1/models/${encodeURIComponent(modelId)}/datasets/select`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datasetId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to select dataset');
    }
    return res.json();
  },

  async uploadDataset(
    modelId: string,
    payload: { name: string; fileFormat: string; content: string; description?: string }
  ): Promise<any> {
    const res = await fetch(`/api/v1/models/${encodeURIComponent(modelId)}/datasets/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok && !data.validation) {
      throw new Error(data.error || 'Failed to upload dataset');
    }
    return data;
  },
};
