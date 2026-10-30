export type ModelTask = 'classification' | 'regression' | 'nlp_llm' | 'computer_vision';
export type Environment = 'production' | 'staging' | 'development';
export type ModelStatus = 'healthy' | 'watch' | 'degraded' | 'critical' | 'inactive';
export type MetricNature = 'observed' | 'estimated' | 'unavailable';

export type ModelDomain =
  | 'Banking & Finance'
  | 'Healthcare'
  | 'E-commerce & Retail'
  | 'NLP & Generative AI'
  | 'Computer Vision'
  | 'Cybersecurity'
  | 'Manufacturing & IoT'
  | 'Education'
  | 'Transportation & Logistics'
  | 'General Machine Learning';

export interface DatasetRecord {
  id: string;
  name: string;
  domain: ModelDomain | string;
  modelId: string;
  recordCount: number;
  featureCount: number;
  features: string[];
  hasGroundTruth: boolean;
  labelColumn?: string;
  isDemo: boolean;
  fileFormat: 'csv' | 'json' | 'jsonl';
  description: string;
  source: 'verified_benchmark' | 'uploaded' | 'synthetic_demo';
  uploadedAt?: string;
  samplePreview?: Record<string, any>[];
  metrics?: {
    accuracy?: number;
    f1Score?: number;
    avgLatencyMs?: number;
  };
}

export interface ModelAlertRuleConfig {
  ruleId: string;
  name: string;
  category: 'drift' | 'latency' | 'confidence' | 'accuracy' | 'subgroup' | 'regression';
  enabled: boolean;
  threshold: number;
  description: string;
  requiresGroundTruth: boolean;
}

export interface ModelDiagnostics {
  alertRulesEnabled: string[];
  lastEventProcessedAt?: string;
  lastAlertGeneratedAt?: string;
  activeIncidentCount: number;
  monitoringStatus: 'active' | 'degraded' | 'warning' | 'idle' | 'unconfigured';
  missingConfigWarnings: string[];
}

export interface ModelRecord {
  id: string;
  name: string;
  task: ModelTask;
  domain: ModelDomain;
  version: string;
  candidateVersion?: string;
  description: string;
  owner: string;
  environment: Environment;
  status: ModelStatus;
  reliabilityScore: number;
  deployedAt: string;
  referenceDataset: string;
  activeDatasetId?: string;
  supportedDatasets?: DatasetRecord[];
  isDemo?: boolean;
  alertRules?: ModelAlertRuleConfig[];
  diagnostics?: ModelDiagnostics;
  inputSchema: Record<string, string>;
  outputSchema: Record<string, string>;
  monitoredSegments: string[];
  features: string[];
  endpointUrl: string;
  summaryMetrics: {
    accuracy: number | null;
    f1Score: number | null;
    p95LatencyMs: number;
    errorRate: number;
    predictionVolume24h: number;
    driftScore: number;
    predictionDriftScore: number;
    uncertaintyRate: number;
    openIncidentsCount: number;
  };
}

export interface PredictionEvent {
  eventId: string;
  modelId: string;
  modelVersion: string;
  timestamp: string;
  features: Record<string, any>;
  prediction: string | number;
  groundTruth?: string | number | null;
  confidence: number;
  latencyMs: number;
  environment: Environment;
  segments: Record<string, string>;
  traceId?: string;
  isSimulated?: boolean;
}

export interface SubgroupSliceMetric {
  segmentKey: string;
  segmentValue: string;
  sampleCount: number;
  accuracy: number | null;
  baselineAccuracy: number | null;
  relativeDropPct: number;
  isSilentFailure: boolean;
  statisticalConfidence: number;
  confidenceInterval: [number, number];
  falsePositiveRate: number;
  falseNegativeRate: number;
  avgConfidence: number;
  metricNature: MetricNature;
  evidence: string;
}

export interface FeatureDriftResult {
  featureName: string;
  driftMetric: 'PSI' | 'Wasserstein' | 'ChiSquare';
  driftScore: number;
  threshold: number;
  hasDrifted: boolean;
  severity: 'none' | 'low' | 'medium' | 'high';
  referenceDistribution: { bin: string; baselineShare: number; currentShare: number }[];
  missingValueRateChange: number;
  explanation: string;
}

export type IncidentSeverity = 'informational' | 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'suppressed';

export interface Incident {
  id: string;
  modelId: string;
  modelVersion: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  detectedRule: string;
  supportingMetrics: Record<string, any>;
  firstSeen: string;
  lastSeen: string;
  occurrenceCount: number;
  affectedSegment?: string;
  suggestedAction: 'rollback' | 'retrain' | 'subgroup_remediation' | 'human_review' | 'pipeline_hotfix';
  assignedOwner: string;
  comments: { id: string; author: string; text: string; timestamp: string }[];
  failureFingerprint?: string;
  isDemo?: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  modelId?: string;
  actor: string;
  action: string;
  details: string;
  severity: 'info' | 'warn' | 'critical';
}

export interface DashboardMetrics {
  model: ModelRecord;
  reliability: {
    score: number;
    status: ModelStatus;
    coveragePct: number;
    components: {
      name: string;
      weight: number;
      score: number;
      status: 'good' | 'fair' | 'poor' | 'unavailable';
      nature: MetricNature;
      observedValue: string;
      description: string;
    }[];
  };
  accuracy: number | null;
  errorRate: number;
  p95Latency: number;
  p50Latency: number;
  p99Latency: number;
  predictionVolume: number;
  driftScore: number;
  predictionDriftScore: number;
  silentFailuresCount: number;
  openIncidentsCount: number;
  subgroups: SubgroupSliceMetric[];
  drifts: FeatureDriftResult[];
  timeSeries: {
    time: string;
    timestamp?: string;
    reliability: number;
    accuracy: number | null;
    latencyP95: number | null;
    volume: number;
    driftScore: number;
    labeledCount?: number;
    hasGroundTruth?: boolean;
  }[];
  recentEvents: PredictionEvent[];
  totalEventsReceived?: number;
  eventsPerSecond?: number;
  lastEventTimestamp?: string;
  streamMode?: 'live_external' | 'simulated_stream';
  dataFreshness?: string;
}

export interface PublicDataFeedState {
  provider: string;
  endpoint: string;
  status: 'connected' | 'degraded' | 'offline';
  lastUpdated: string;
  updateFrequency: string;
  isLive: boolean;
  station: string;
  currentObservations?: {
    temperatureC: number;
    relativeHumidityPct: number;
    windSpeedKmh: number;
    surfacePressureHpa: number;
    cloudCoverPct: number;
  };
  currentObservation: {
    temperature_c: number;
    humidity_pct: number;
    wind_speed_kmh: number;
    surface_pressure_hpa: number;
  };
  baseline24h: {
    avg_temp_c: number;
    avg_humidity_pct: number;
  };
  distributionDrift: {
    psi_score: number;
    wasserstein_dist: number;
    items?: {
      feature: string;
      baselineMean: number;
      observedCurrent: number;
      psiScore: number;
      hasDrifted: boolean;
    }[];
  };
  notes: string;
}

export interface HiddenFailureRadarResponse {
  modelId: string;
  modelName: string;
  modelVersion: string;
  aggregateAccuracy: number;
  totalEvaluatedSamples: number;
  silentFailuresDetected: number;
  slices: {
    segmentKey: string;
    segmentValue: string;
    label: string;
    sampleCount: number;
    accuracy: number | null;
    baselineAccuracy: number | null;
    relativeDropPct: number;
    confidenceInterval: [number, number];
    pValue: number;
    severity: 'critical' | 'high' | 'medium' | 'nominal' | 'inconclusive';
    evidence: string;
    recommendedNextAction: string;
  }[];
  evaluationTimestamp: string;
}
