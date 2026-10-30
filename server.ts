import http from 'http';
import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { store } from './server/store.ts';
import { investigateRootCause } from './server/gemini.ts';
import { fetchLivePublicData, getPublicDataFeed } from './server/publicData.ts';
import type { PredictionEvent } from './server/types.ts';

process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = 'true';

process.on('uncaughtException', (err) => {
  console.error('[SentinelAI UncaughtException]:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[SentinelAI UnhandledRejection]:', reason);
});

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getCliArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length && !process.argv[idx + 1].startsWith('-')) {
    return process.argv[idx + 1];
  }
  return undefined;
}

const PORT = Number(process.env.PORT) || Number(getCliArg('--port')) || 3000;
const HOST = process.env.HOST || getCliArg('--host') || '0.0.0.0';

const app = express();
app.use(express.json({ limit: '10mb' }));

// SSE Active Client Connections
interface SSEClient {
  id: string;
  res: Response;
  modelId: string;
}
let sseClients: SSEClient[] = [];

function broadcastSSE(data: any, targetModelId?: string) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    if (!targetModelId || client.modelId === 'all' || client.modelId === targetModelId) {
      try {
        client.res.write(payload);
      } catch (err) {
        // will be cleaned on close
      }
    }
  }
}

// Background Simulated Traffic Loop
let trafficTimer: NodeJS.Timeout | null = null;
let trafficSpeedMs = 2000;
let trafficActive = true;

function startTrafficGenerator() {
  if (trafficTimer) clearInterval(trafficTimer);
  trafficTimer = setInterval(() => {
    try {
      if (!trafficActive) return;

      // Pick a model to emit a live prediction event (prioritizing connected client models)
      const models = store.getModels();
      if (!models.length) return;
    
    // Check if any clients are connected to specific models
    const activeModelIds = sseClients.map((c) => c.modelId).filter((id) => id && id !== 'all');
    let targetModelId = models[0].id;
    if (activeModelIds.length > 0 && Math.random() < 0.75) {
      targetModelId = activeModelIds[Math.floor(Math.random() * activeModelIds.length)];
    } else {
      targetModelId = models[Math.floor(Math.random() * models.length)].id;
    }
    const model = store.getModel(targetModelId) || models[0];

    let event: PredictionEvent;
    const now = new Date().toISOString();
    const eventId = `EV-LIVE-${Date.now().toString().slice(-6)}`;

    if (model.id === 'cardio-risk-v3.2') {
      const isElderly = Math.random() < 0.38;
      const ageGroup = isElderly ? '65+' : Math.random() < 0.6 ? '40-64' : '18-39';
      const groundTruth = Math.random() < 0.3 ? 'high_risk' : 'low_risk';
      let prediction = groundTruth;
      let conf = 0.88 + Math.random() * 0.08;

      if (isElderly && Math.random() < 0.45) {
        prediction = groundTruth === 'high_risk' ? 'low_risk' : 'high_risk';
      }

      event = {
        eventId,
        modelId: model.id,
        modelVersion: model.version,
        timestamp: now,
        features: {
          age: isElderly ? 68 + Math.floor(Math.random() * 18) : 32 + Math.floor(Math.random() * 25),
          systolic_bp: 120 + Math.floor(Math.random() * 45),
          total_cholesterol: 180 + Math.floor(Math.random() * 80),
          smoking_status: Math.random() < 0.2 ? 1 : 0,
        },
        prediction,
        groundTruth,
        confidence: Number(conf.toFixed(3)),
        latencyMs: Math.floor(110 + Math.random() * 50),
        environment: model.environment,
        segments: {
          age_group: ageGroup,
          care_facility: Math.random() < 0.5 ? 'Metropolitan General' : 'St. Jude Regional',
        },
        isSimulated: true,
      };
    } else {
      const fObj: Record<string, any> = {};
      const fList = model.features && model.features.length ? model.features : ['feature_x1', 'feature_x2'];
      fList.forEach((f, idx) => {
        fObj[f] = Number((15 * (idx + 1) + Math.random() * 20).toFixed(2));
      });
      const gt = model.task === 'regression' ? Number((50 + Math.random() * 50).toFixed(1)) : 'class_0';
      const pred = gt;
      const p95 = model.summaryMetrics?.p95LatencyMs || 60;

      event = {
        eventId,
        modelId: model.id,
        modelVersion: model.version,
        timestamp: now,
        features: fObj,
        prediction: pred,
        groundTruth: gt,
        confidence: Number((0.88 + Math.random() * 0.09).toFixed(3)),
        latencyMs: Math.max(15, Math.floor(p95 * (0.7 + Math.random() * 0.5))),
        environment: model.environment,
        segments: {
          [model.monitoredSegments?.[0] || 'segment']: 'Group_Standard',
        },
        isSimulated: true,
      };
    }

      store.addEvent(event);
      broadcastSSE({ type: 'INFERENCE_EVENT', event }, model.id);
    } catch (trafficErr) {
      console.warn('[SentinelAI] Simulated traffic generator warning:', trafficErr);
    }
  }, trafficSpeedMs);
}

// Start traffic generator automatically
startTrafficGenerator();

// ==========================================
// CANONICAL SENTINELAI V1 API ROUTES
// ==========================================

// Health Check
app.get(['/api/v1/health', '/api/health'], (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    platform: 'SentinelAI Core Reliability Monitoring Engine',
    version: '2.4.0',
    uptime_seconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    event_buffer_size: store.totalEventsCount,
    events_per_second: store.getEventsPerSecond(),
    connected_sse_clients: sseClients.length,
    active_models_count: store.getModels().length,
  });
});

// Single Event Ingestion API
app.post(['/api/v1/events', '/api/events'], (req: Request, res: Response) => {
  try {
    const event = store.validateAndAddEvent(req.body, false);
    broadcastSSE({ type: 'INFERENCE_EVENT', event }, event.modelId);
    res.status(201).json({
      success: true,
      event_id: event.eventId,
      timestamp: event.timestamp,
      model_id: event.modelId,
      status: 'PROCESSED_AND_STORED',
      message: 'Prediction event validated against schema and queued for drift/subgroup disparity evaluation.',
      event,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: 'EVENT_VALIDATION_ERROR',
      message: err.message,
    });
  }
});

// Batch Event Ingestion API
app.post(['/api/v1/events/batch', '/api/events/batch'], (req: Request, res: Response) => {
  const body = req.body;
  const items = Array.isArray(body) ? body : body?.events || [body];
  const accepted: PredictionEvent[] = [];
  const errors: { index: number; error: string }[] = [];

  for (let i = 0; i < items.length; i++) {
    try {
      const ev = store.validateAndAddEvent(items[i], false);
      accepted.push(ev);
      broadcastSSE({ type: 'INFERENCE_EVENT', event: ev }, ev.modelId);
    } catch (err: any) {
      errors.push({ index: i, error: err.message });
    }
  }

  res.status(errors.length > 0 && accepted.length === 0 ? 400 : 202).json({
    success: errors.length === 0,
    total_received: items.length,
    accepted_count: accepted.length,
    failed_count: errors.length,
    validation_errors: errors.length > 0 ? errors : undefined,
    status: 'BATCH_PROCESSED_AND_STORED',
    events: accepted.slice(0, 10),
  });
});

// GET Events List
app.get(['/api/v1/events', '/api/events'], (req: Request, res: Response) => {
  const modelId = (req.query.model_id as string) || (req.query.modelId as string) || 'cardio-risk-v3.2';
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
  const events = store.getEvents(modelId, limit);
  res.json({
    model_id: modelId,
    count: events.length,
    total_in_buffer: store.totalEventsCount,
    events: events.reverse(),
  });
});

// GET Monitoring Overview
app.get(['/api/v1/monitoring/overview', '/api/dashboard'], (req: Request, res: Response) => {
  const modelId = (req.query.model_id as string) || (req.query.modelId as string) || undefined;
  const timeRange = (req.query.time_range as string) || (req.query.timeRange as string) || '24h';
  const overview = store.getLiveOverview(modelId, timeRange);
  res.json(overview);
});

// GET Monitoring Metrics (Time-series trends)
app.get('/api/v1/monitoring/metrics', (req: Request, res: Response) => {
  const modelId = (req.query.model_id as string) || (req.query.modelId as string) || 'cardio-risk-v3.2';
  const timeRange = (req.query.time_range as string) || (req.query.timeRange as string) || '24h';
  const metrics = store.getDashboardMetrics(modelId, timeRange);
  res.json({
    model_id: modelId,
    time_range: timeRange,
    time_series: metrics.timeSeries,
    p95_latency_ms: metrics.p95Latency,
    p50_latency_ms: metrics.p50Latency,
    p99_latency_ms: metrics.p99Latency,
    accuracy: metrics.accuracy,
    error_rate: metrics.errorRate,
    events_per_second: store.getEventsPerSecond(),
  });
});

// GET Feature and Prediction Drift
app.get(['/api/v1/monitoring/drift', '/api/drift'], (req: Request, res: Response) => {
  const modelId = (req.query.model_id as string) || (req.query.modelId as string) || 'cardio-risk-v3.2';
  const model = store.getModel(modelId);
  const drifts = store.getDriftResults(modelId);
  res.json({
    model_id: modelId,
    reference_dataset: model?.referenceDataset || 'Baseline reference',
    drift_score: Math.max(...drifts.map((d) => d.driftScore), 0.05),
    prediction_drift_score: model?.summaryMetrics.predictionDriftScore || 0.12,
    features: drifts,
    evaluation_window: 'Trailing 24 hours (continuous)',
  });
});

// GET Hidden Failure Radar (Segment Disparities)
app.get(['/api/v1/monitoring/failures', '/api/subgroups'], (req: Request, res: Response) => {
  const modelId = (req.query.model_id as string) || (req.query.modelId as string) || 'cardio-risk-v3.2';
  const failureRadar = store.getHiddenFailureRadar(modelId);
  res.json(failureRadar);
});

// GET Incidents
app.get(['/api/v1/incidents', '/api/incidents'], (req: Request, res: Response) => {
  const modelId = (req.query.model_id as string) || (req.query.modelId as string) || undefined;
  res.json(store.getIncidents(modelId));
});

// GET Models
app.get(['/api/v1/models', '/api/models'], (req: Request, res: Response) => {
  res.json(store.getModels());
});

app.get(['/api/v1/models/:id', '/api/models/:id'], (req: Request, res: Response) => {
  const model = store.getModel(req.params.id);
  if (!model) return res.status(404).json({ error: 'Model not found' });
  res.json(model);
});

app.post(['/api/v1/models', '/api/models'], (req: Request, res: Response) => {
  const model = store.saveModel(req.body);
  res.status(201).json(model);
});

app.put(['/api/v1/models/:id', '/api/models/:id'], (req: Request, res: Response) => {
  const updated = store.saveModel({ ...req.body, id: req.params.id });
  res.json(updated);
});

app.delete(['/api/v1/models/:id', '/api/models/:id'], (req: Request, res: Response) => {
  const ok = store.deleteModel(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Model not found' });
  res.json({ success: true });
});

// ==========================================
// DATASET SELECTION & VALIDATION API ROUTES
// ==========================================

// GET Datasets for a model
app.get(['/api/v1/models/:id/datasets', '/api/models/:id/datasets'], (req: Request, res: Response) => {
  const modelId = req.params.id;
  const datasets = store.getModelDatasets(modelId);
  res.json({
    model_id: modelId,
    count: datasets.length,
    datasets,
  });
});

// SELECT an active dataset for a model
app.post(['/api/v1/models/:id/datasets/select', '/api/models/:id/datasets/select'], (req: Request, res: Response) => {
  const modelId = req.params.id;
  const { datasetId } = req.body;
  if (!datasetId) return res.status(400).json({ error: 'datasetId is required' });
  try {
    const result = store.selectDataset(modelId, datasetId);
    broadcastSSE({ type: 'DATASET_SELECTED', modelId, dataset: result.dataset }, modelId);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// UPLOAD & VALIDATE a dataset (CSV / JSON / JSONL)
app.post(['/api/v1/models/:id/datasets/upload', '/api/models/:id/datasets/upload'], (req: Request, res: Response) => {
  const modelId = req.params.id;
  const { name, fileFormat = 'csv', content, description } = req.body;
  if (!content) return res.status(400).json({ error: 'File content is required' });

  try {
    const result = store.uploadAndValidateDataset(modelId, {
      name: name || `Uploaded_Dataset_${Date.now()}`,
      fileFormat,
      content,
      description,
    });
    broadcastSSE({ type: 'DATASET_UPLOADED', modelId, dataset: result.dataset }, modelId);
    res.status(result.validation.isValid ? 201 : 400).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Test External Model REST Endpoint Adapter
app.post(['/api/v1/models/test-connection', '/api/models/test-connection'], async (req: Request, res: Response) => {
  const { endpointUrl, authType, authToken, timeoutMs = 5000 } = req.body;
  if (!endpointUrl) {
    return res.status(400).json({ error: 'endpointUrl is required' });
  }

  const start = Date.now();
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'SentinelAI-Model-Adapter/2.4',
    };
    if (authType === 'bearer' && authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    } else if (authType === 'apiKey' && authToken) {
      headers['X-API-Key'] = authToken;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const probe = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ping: true, sentinel_probe: true }),
      signal: controller.signal,
    }).catch(async () => {
      // Fallback probe GET
      return await fetch(endpointUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
    });
    clearTimeout(timeout);
    const latencyMs = Date.now() - start;

    res.json({
      connected: probe.status < 500,
      statusCode: probe.status,
      latencyMs,
      endpointUrl,
      statusText: probe.statusText || (probe.status < 400 ? 'OK' : 'Error response from adapter'),
      testedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.json({
      connected: false,
      statusCode: 0,
      latencyMs: Date.now() - start,
      endpointUrl,
      error: err.name === 'AbortError' ? 'Connection timed out' : err.message,
      testedAt: new Date().toISOString(),
    });
  }
});

// Live Public Data Integration (Open-Meteo)
app.get(['/api/v1/public-data', '/api/public-data'], async (req: Request, res: Response) => {
  const feed = await fetchLivePublicData();
  res.json(feed);
});

// Incident Status update & comments
app.patch(['/api/v1/incidents/:id/status', '/api/incidents/:id/status'], (req: Request, res: Response) => {
  const { status, actor } = req.body;
  const incident = store.updateIncidentStatus(req.params.id, status, actor);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });
  broadcastSSE({ type: 'INCIDENT_UPDATED', incident });
  res.json(incident);
});

app.post(['/api/v1/incidents/:id/comments', '/api/incidents/:id/comments'], (req: Request, res: Response) => {
  const { author, text } = req.body;
  const incident = store.addIncidentComment(req.params.id, author, text);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });
  broadcastSSE({ type: 'INCIDENT_UPDATED', incident });
  res.json(incident);
});

// Audit Logs
app.get(['/api/v1/audit-logs', '/api/audit-logs'], (req: Request, res: Response) => {
  res.json(store.getAuditLogs());
});

// Root Cause Investigation Assistant (Gemini 3.8 Flash + deterministic fallback)
app.post(['/api/v1/investigate', '/api/investigate'], async (req: Request, res: Response) => {
  try {
    const { question, modelId } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const targetModelId = modelId || 'cardio-risk-v3.2';
    const model = store.getModel(targetModelId) || store.getModels()[0];
    const incidents = store.getIncidents(targetModelId);
    const subgroupFailures = store.getSubgroupAnalysis(targetModelId);
    const driftResults = store.getDriftResults(targetModelId);
    const events = store.getEvents(targetModelId, 100);
    const p95 = events.length > 0 ? events[events.length - 1].latencyMs : 120;

    const result = await investigateRootCause(question, {
      model,
      incidents,
      subgroupFailures,
      driftResults,
      recentLatencyP95: p95,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error during root cause investigation:', error);
    res.status(500).json({ error: 'Failed to process investigation', details: error.message });
  }
});

// Model Version Comparison Guard
app.get(['/api/v1/compare', '/api/compare'], (req: Request, res: Response) => {
  const modelId = (req.query.model_id as string) || (req.query.modelId as string) || 'cardio-risk-v3.2';
  const comparison = store.compareModelVersions(modelId);
  res.json(comparison);
});

// What-If Simulation Sandbox
app.post(['/api/v1/simulate', '/api/simulate'], (req: Request, res: Response) => {
  const { modelId, injectedDriftPsi, subgroupErrorSpikePct, trafficSurgeFactor, latencyMultiplier } = req.body;
  const targetModelId = modelId || 'cardio-risk-v3.2';
  const result = store.runSimulation(targetModelId, {
    injectedDriftPsi: Number(injectedDriftPsi) || 0,
    subgroupErrorSpikePct: Number(subgroupErrorSpikePct) || 0,
    trafficSurgeFactor: Number(trafficSurgeFactor) || 1,
    latencyMultiplier: Number(latencyMultiplier) || 1,
  });
  res.json(result);
});

// Ingest API alias
app.post('/api/ingest', (req: Request, res: Response) => {
  const body = req.body;
  const items: any[] = Array.isArray(body) ? body : [body];
  let accepted = 0;

  for (const item of items) {
    try {
      const event = store.validateAndAddEvent(item, false);
      accepted++;
      broadcastSSE({ type: 'INFERENCE_EVENT', event }, event.modelId);
    } catch (err) {
      // skip invalid in old endpoint
    }
  }

  res.status(202).json({
    acceptedCount: accepted,
    status: 'INGESTED_AND_EVALUATED',
  });
});

// Traffic controls
app.post('/api/traffic/toggle', (req: Request, res: Response) => {
  const { active, speedMs } = req.body;
  if (active !== undefined) trafficActive = Boolean(active);
  if (speedMs) {
    trafficSpeedMs = Math.max(500, Number(speedMs));
    startTrafficGenerator();
  }
  res.json({ active: trafficActive, speedMs: trafficSpeedMs });
});

// Inject Anomaly Bursts
app.post('/api/traffic/inject', (req: Request, res: Response) => {
  const { modelId, type } = req.body;
  const target = modelId || 'cardio-risk-v3.2';

  if (type === 'silent_failure') {
    // Inject 15 false predictions for elderly segment with high confidence
    for (let i = 0; i < 15; i++) {
      store.addEvent({
        eventId: `EV-BURST-FAIL-${Date.now()}-${i}`,
        modelId: target,
        modelVersion: '3.2.0',
        timestamp: new Date().toISOString(),
        features: { age: 74, systolic_bp: 155, total_cholesterol: 240, smoking_status: 1 },
        prediction: 'low_risk', // Severe missed risk!
        groundTruth: 'high_risk',
        confidence: 0.94,
        latencyMs: 135,
        environment: 'production',
        segments: { age_group: '65+' },
        isSimulated: true,
      });
    }
    store.addAuditLog('Operator', 'ANOMALY_BURST_INJECTED', `Injected 15 silent failure events for model ${target} on age_group: 65+`, 'warn');
  } else if (type === 'drift_surge') {
    for (let i = 0; i < 20; i++) {
      store.addEvent({
        eventId: `EV-BURST-DRIFT-${Date.now()}-${i}`,
        modelId: target,
        modelVersion: '2.1.4',
        timestamp: new Date().toISOString(),
        features: { velocity_1h: 45 + i, amount_usd: 1200 },
        prediction: '1',
        groundTruth: '0',
        confidence: 0.91,
        latencyMs: 180,
        environment: 'production',
        segments: { country_group: 'cross_border' },
        isSimulated: true,
      });
    }
    store.addAuditLog('Operator', 'DRIFT_BURST_INJECTED', `Injected 20 extreme drift records for model ${target}`, 'warn');
  }

  broadcastSSE({ type: 'ANOMALY_BURST_INJECTED', modelId: target, anomalyType: type });
  res.json({ success: true, message: `Anomaly burst (${type}) successfully injected into model ${target}` });
});

// Server-Sent Events (SSE) Stream
app.get(['/api/v1/stream', '/api/stream'], (req: Request, res: Response) => {
  const modelId = (req.query.model_id as string) || (req.query.modelId as string) || 'all';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const newClient: SSEClient = { id: clientId, res, modelId };
  sseClients.push(newClient);

  // Send initial handshake
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId, activeClients: sseClients.length })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter((c) => c.id !== clientId);
  });
});

// Export Comprehensive Report
app.get('/api/export-report', (req: Request, res: Response) => {
  const modelId = (req.query.modelId as string) || 'cardio-risk-v3.2';
  const model = store.getModel(modelId) || store.getModels()[0];
  const metrics = store.getDashboardMetrics(modelId);
  const incidents = store.getIncidents(modelId);

  const report = {
    platform: 'SentinelAI — AI Reliability & Self-Breaking Model Detection Platform',
    generatedAt: new Date().toISOString(),
    model: {
      id: model.id,
      name: model.name,
      version: model.version,
      task: model.task,
      environment: model.environment,
      status: model.status,
      reliabilityScore: metrics.reliability.score,
    },
    metricsSummary: {
      overallAccuracy: metrics.accuracy,
      errorRate: metrics.errorRate,
      p95LatencyMs: metrics.p95Latency,
      featureDriftScore: metrics.driftScore,
      silentSubgroupFailuresDetected: metrics.silentFailuresCount,
    },
    subgroupAnalysis: metrics.subgroups.map((s) => ({
      segment: `${s.segmentKey}: ${s.segmentValue}`,
      sampleCount: s.sampleCount,
      accuracy: s.accuracy,
      baselineAccuracy: s.baselineAccuracy,
      relativeDropPct: s.relativeDropPct,
      isSilentFailure: s.isSilentFailure,
      evidence: s.evidence,
    })),
    featureDriftBreakdown: metrics.drifts.map((d) => ({
      feature: d.featureName,
      metric: d.driftMetric,
      score: d.driftScore,
      severity: d.severity,
      explanation: d.explanation,
    })),
    incidents: incidents.map((i) => ({
      id: i.id,
      title: i.title,
      severity: i.severity,
      status: i.status,
      firstSeen: i.firstSeen,
      rule: i.detectedRule,
      suggestedAction: i.suggestedAction,
    })),
    auditSignature: 'VERIFIED_BY_SENTINELAI_CORE_OBSERVABILITY_ENGINE',
  };

  res.setHeader('Content-Disposition', `attachment; filename="sentinel-ai-report-${modelId}.json"`);
  res.json(report);
});

// ==========================================
// VITE DEV SERVER OR STATIC PRODUCTION
// ==========================================
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    // Serve production build
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Mount Vite middleware for dev mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[SentinelAI] Port ${PORT} temporarily busy, retrying in 1s...`);
      setTimeout(() => {
        try {
          httpServer.close();
        } catch (_) {}
        httpServer.listen(PORT, HOST);
      }, 1000);
    } else {
      console.error('[SentinelAI] HTTP server error:', err);
    }
  });

  httpServer.listen(PORT, HOST, () => {
    console.log(`SentinelAI observability platform running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup failure:', err);
});
