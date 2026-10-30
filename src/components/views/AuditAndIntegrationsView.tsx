import React, { useEffect, useState } from 'react';
import { AuditLog, ModelRecord, PublicDataFeedState } from '../../types';
import { api } from '../../api';
import {
  Database,
  Download,
  Copy,
  Check,
  Code2,
  Terminal,
  Shield,
  CloudSun,
  Activity,
  Zap,
  Globe,
  Radio,
  Server,
  Play,
  Pause,
  AlertTriangle,
  Send,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface AuditAndIntegrationsViewProps {
  model: ModelRecord;
}

export const AuditAndIntegrationsView: React.FC<AuditAndIntegrationsViewProps> = ({ model }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logSearch, setLogSearch] = useState('');
  const [logSeverityFilter, setLogSeverityFilter] = useState<string>('all');
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedPython, setCopiedPython] = useState(false);
  const [copiedNode, setCopiedNode] = useState(false);

  // Public Telemetry Data
  const [publicData, setPublicData] = useState<PublicDataFeedState | null>(null);
  const [loadingPublicData, setLoadingPublicData] = useState(false);

  // Model Adapter Tester
  const [adapterUrl, setAdapterUrl] = useState('https://api.internal-ml.corp/v1/predict');
  const [adapterAuthType, setAdapterAuthType] = useState<'none' | 'bearer' | 'apiKey'>('bearer');
  const [adapterToken, setAdapterToken] = useState('sk-live-sentinel-token-xyz');
  const [adapterProtocol, setAdapterProtocol] = useState('REST (JSON)');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    connected: boolean;
    statusCode: number;
    latencyMs: number;
    statusText?: string;
    error?: string;
    testedAt: string;
  } | null>(null);

  // Stream Simulator Controls
  const [simActive, setSimActive] = useState(true);
  const [simSpeedMs, setSimSpeedMs] = useState(2500);
  const [anomalyStatus, setAnomalyStatus] = useState<string | null>(null);

  // Manual Ingestion Tester
  const [manualEventJson, setManualEventJson] = useState(
    JSON.stringify(
      {
        model_id: model.id,
        model_version: model.version,
        features: {
          systolic_bp: 145,
          age: 72,
          total_cholesterol: 235,
        },
        prediction: 'high_risk',
        actual_label: 'high_risk',
        confidence: 0.93,
        latency_ms: 78,
        segment_attributes: {
          age_group: '65+',
          care_facility: 'Metro General',
        },
      },
      null,
      2
    )
  );
  const [manualIngestStatus, setManualIngestStatus] = useState<string | null>(null);

  const fetchPublicFeed = async () => {
    setLoadingPublicData(true);
    try {
      const data = await api.getPublicData();
      setPublicData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPublicData(false);
    }
  };

  useEffect(() => {
    api.getAuditLogs().then(setLogs).catch(console.error);
    fetchPublicFeed();
    const interval = setInterval(fetchPublicFeed, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await api.testModelConnection(adapterUrl, adapterAuthType, adapterToken);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        connected: false,
        statusCode: 0,
        latencyMs: 0,
        error: err.message || 'Network unreachable',
        testedAt: new Date().toISOString(),
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleToggleStream = async () => {
    const nextState = !simActive;
    setSimActive(nextState);
    await api.toggleTraffic(nextState, simSpeedMs).catch(console.error);
  };

  const handleSpeedChange = async (ms: number) => {
    setSimSpeedMs(ms);
    await api.toggleTraffic(simActive, ms).catch(console.error);
  };

  const handleInjectBurst = async (type: 'silent_failure' | 'drift_surge') => {
    setAnomalyStatus(`Injecting ${type === 'silent_failure' ? 'subgroup failure burst' : 'drift surge'}...`);
    try {
      await api.injectAnomalyBurst(model.id, type);
      setAnomalyStatus(`Successfully injected ${type} into model stream! Check Live Monitor.`);
      setTimeout(() => setAnomalyStatus(null), 4000);
    } catch (err: any) {
      setAnomalyStatus(`Injection failed: ${err.message}`);
    }
  };

  const handleManualIngest = async () => {
    setManualIngestStatus('Validating and transmitting event...');
    try {
      const parsed = JSON.parse(manualEventJson);
      const res = await api.ingestPrediction(parsed);
      setManualIngestStatus(`Success: Ingested event ${res.event_id || res.acceptedCount || 'OK'}`);
      setTimeout(() => setManualIngestStatus(null), 3500);
    } catch (err: any) {
      setManualIngestStatus(`Error: ${err.message}`);
    }
  };

  const curlExample = `curl -X POST https://ais-dev-w5zh7f2zmkwr3yiqaclkr5-791922266192.asia-northeast1.run.app/api/v1/events \\
  -H "Content-Type: application/json" \\
  -d '{
    "model_id": "${model.id}",
    "model_version": "${model.version}",
    "input_features": {
      "systolic_bp": 140,
      "age": 70,
      "total_cholesterol": 220
    },
    "prediction": "high_risk",
    "actual_label": "high_risk",
    "confidence": 0.92,
    "latency_ms": 85,
    "segment_attributes": {
      "age_group": "65+",
      "care_facility": "Metropolitan General"
    }
  }'`;

  const pythonExample = `import requests

url = "https://ais-dev-w5zh7f2zmkwr3yiqaclkr5-791922266192.asia-northeast1.run.app/api/v1/events"

payload = {
    "model_id": "${model.id}",
    "model_version": "${model.version}",
    "input_features": {
        "systolic_bp": 140,
        "age": 70,
        "total_cholesterol": 220
    },
    "prediction": "high_risk",
    "actual_label": "high_risk",
    "confidence": 0.92,
    "latency_ms": 85,
    "segment_attributes": {
        "age_group": "65+",
        "care_facility": "Metropolitan General"
    }
}

response = requests.post(url, json=payload)
print(response.status_code, response.json())`;

  const nodeExample = `import fetch from 'node-fetch';

const response = await fetch('https://ais-dev-w5zh7f2zmkwr3yiqaclkr5-791922266192.asia-northeast1.run.app/api/v1/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model_id: '${model.id}',
    model_version: '${model.version}',
    input_features: { systolic_bp: 140, age: 70, total_cholesterol: 220 },
    prediction: 'high_risk',
    actual_label: 'high_risk',
    confidence: 0.92,
    latency_ms: 85,
    segment_attributes: { age_group: '65+' }
  })
});
const data = await response.json();
console.log(data);`;

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.actor.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(logSearch.toLowerCase());
    const matchesSeverity = logSeverityFilter === 'all' || log.severity === logSeverityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Top Banner */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-400" />
              <span>Data Sources, Live Integrations &amp; Audit Trail</span>
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              REST / SSE / Webhooks / Open-Meteo
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Manage genuine public environmental feeds, test external model REST adapters, control real-time traffic generation, review developer ingestion code, and inspect the immutable governance audit ledger.
          </p>
        </div>

        <a
          href={`/api/export-report?modelId=${model.id}`}
          download={`sentinel-ai-report-${model.id}.json`}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-sm shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export JSON Audit Report</span>
        </a>
      </div>

      {/* Grid Row 1: Live Public Data Telemetry & Real-Time Test Stream Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Genuine Public Data Feed Card (Open-Meteo) */}
        <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <CloudSun className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-xs font-bold text-slate-100 font-mono flex items-center gap-2">
                    <span>Live Public Data Telemetry Integration</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-800/80 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live Feed
                    </span>
                  </h3>
                  <div className="text-[11px] text-slate-400 font-sans">
                    Provider: Open-Meteo Meteorological Service (WMO Verified Public Station)
                  </div>
                </div>
              </div>

              <button
                onClick={fetchPublicFeed}
                disabled={loadingPublicData}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                title="Refresh Live Public Observations"
              >
                <RefreshCw className={`w-3 h-3 ${loadingPublicData ? 'animate-spin text-amber-400' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
              Continuously incoming public observation feed demonstrating real-time statistical distribution shifts and drift tracking. This is independent from private model inferences.
            </p>

            {publicData ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg">
                  <div className="text-[10px] font-mono text-slate-500">SURFACE TEMP</div>
                  <div className="text-base font-bold font-mono text-slate-100 mt-0.5">
                    {publicData.currentObservation.temperature_c.toFixed(1)}°C
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Baseline: {publicData.baseline24h.avg_temp_c.toFixed(1)}°C
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg">
                  <div className="text-[10px] font-mono text-slate-500">REL. HUMIDITY</div>
                  <div className="text-base font-bold font-mono text-cyan-400 mt-0.5">
                    {publicData.currentObservation.humidity_pct.toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Baseline: {publicData.baseline24h.avg_humidity_pct.toFixed(0)}%
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg">
                  <div className="text-[10px] font-mono text-slate-500">WIND SPEED</div>
                  <div className="text-base font-bold font-mono text-slate-100 mt-0.5">
                    {publicData.currentObservation.wind_speed_kmh.toFixed(1)} km/h
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Gusts: {publicData.currentObservation.wind_speed_kmh > 15 ? 'Elevated' : 'Calm'}
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg">
                  <div className="text-[10px] font-mono text-slate-500">DRIFT (PSI / WASSER.)</div>
                  <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
                    {publicData.distributionDrift.psi_score.toFixed(3)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Dist: {publicData.distributionDrift.wasserstein_dist.toFixed(2)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-lg text-center text-xs text-slate-500">
                Contacting public meteorological station...
              </div>
            )}

            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                Station: {publicData?.station || 'San Francisco WMO Station #724940 (37.77°N, -122.42°W)'}
              </span>
              <span>Updated: {publicData ? new Date(publicData.lastUpdated).toLocaleTimeString() : 'syncing...'}</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Authentication: Public CORS-enabled WMO Gateway (Zero credentials required).</span>
            <span>API Keys for private pipelines configured securely via <code className="text-slate-400">.env</code>.</span>
          </div>
        </div>

        {/* Real-Time Test Stream Generator Control */}
        <div className="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-xs font-bold text-slate-100 font-mono flex items-center gap-2">
                    <span>Live Test Stream Generator</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      SIMULATED STREAM
                    </span>
                  </h3>
                  <div className="text-[11px] text-slate-400 font-sans">
                    Exercises live ingestion, statistical calculation, and SSE push
                  </div>
                </div>
              </div>

              <button
                onClick={handleToggleStream}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors ${
                  simActive
                    ? 'bg-rose-950/40 border border-rose-800/80 text-rose-400 hover:bg-rose-900/40'
                    : 'bg-emerald-950/40 border border-emerald-800/80 text-emerald-400 hover:bg-emerald-900/40'
                }`}
              >
                {simActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{simActive ? 'Pause Stream' : 'Start Stream'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
              Sends structured prediction events into <code className="text-amber-400 font-mono">POST /api/v1/events</code> at configurable rates to test real-time alerts without affecting audit certifications.
            </p>

            {/* Ingestion Rate Selector */}
            <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg mb-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Stream Rate</span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {simSpeedMs === 1000 ? '1.0 event / sec' : simSpeedMs === 2500 ? '0.4 event / sec' : '0.2 event / sec'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: '0.2 / sec', ms: 5000 },
                  { label: '0.4 / sec (Normal)', ms: 2500 },
                  { label: '1.0 / sec (High)', ms: 1000 },
                ].map((rate) => (
                  <button
                    key={rate.ms}
                    onClick={() => handleSpeedChange(rate.ms)}
                    className={`py-1 text-[11px] font-mono rounded-md border transition-colors ${
                      simSpeedMs === rate.ms
                        ? 'bg-amber-500/20 border-amber-400 text-amber-400 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {rate.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Instant Anomaly Bursts */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Instant Anomaly Injection (Testing)</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleInjectBurst('silent_failure')}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-400 text-[11px] font-medium rounded-lg transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Subgroup Failure Burst</span>
                </button>
                <button
                  onClick={() => handleInjectBurst('drift_surge')}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-rose-800/80 text-rose-400 text-[11px] font-medium rounded-lg transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 text-rose-400" />
                  <span>Feature Drift Surge</span>
                </button>
              </div>
            </div>

            {anomalyStatus && (
              <div className="mt-2 p-2 bg-slate-900 border border-amber-400/40 text-amber-400 text-[11px] font-mono rounded-lg">
                {anomalyStatus}
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 text-[10px] text-slate-500 border-t border-slate-800">
            Note: All events generated here carry <code className="text-slate-400">isSimulated: true</code> flag.
          </div>
        </div>
      </div>

      {/* Grid Row 2: External Model Adapter Tester & Manual Ingestion Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* External Model Adapter Connection Tester */}
        <div className="lg:col-span-6 bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-xs font-bold text-slate-100 font-mono">
                    External Model REST Adapter Tester
                  </h3>
                  <div className="text-[11px] text-slate-400 font-sans">
                    Validate external model endpoints before registering into production routing
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
              Connect models hosted in external VPCs, SageMaker, or on-prem clusters. SentinelAI executes actual HTTP probes and never assumes connectivity without live verification.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                  Inference Endpoint URL
                </label>
                <input
                  type="text"
                  value={adapterUrl}
                  onChange={(e) => setAdapterUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-400"
                  placeholder="https://api.your-ml-cluster.com/v1/predict"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                    Protocol / Adapter
                  </label>
                  <select
                    value={adapterProtocol}
                    onChange={(e) => setAdapterProtocol(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-amber-400"
                  >
                    <option value="REST (JSON)">REST (JSON Payload)</option>
                    <option value="Triton">Triton Inference Server</option>
                    <option value="TorchServe">TorchServe HTTP</option>
                    <option value="SageMaker">AWS SageMaker Invocation</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                    Authentication Type
                  </label>
                  <select
                    value={adapterAuthType}
                    onChange={(e) => setAdapterAuthType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-amber-400"
                  >
                    <option value="none">No Auth (Public / Internal)</option>
                    <option value="bearer">Bearer Token (Authorization Header)</option>
                    <option value="apiKey">API Key (X-API-Key Header)</option>
                  </select>
                </div>
              </div>

              {adapterAuthType !== 'none' && (
                <div>
                  <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                    Auth Secret / Token
                  </label>
                  <input
                    type="password"
                    value={adapterToken}
                    onChange={(e) => setAdapterToken(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-400"
                    placeholder="Enter auth token..."
                  />
                </div>
              )}

              <button
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-sm"
              >
                <Activity className={`w-4 h-4 ${testingConnection ? 'animate-spin' : ''}`} />
                <span>{testingConnection ? 'Probing Model Endpoint...' : 'Execute Live Connection Test'}</span>
              </button>

              {testResult && (
                <div
                  className={`p-3 rounded-lg border text-xs font-mono ${
                    testResult.connected
                      ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-400'
                      : 'bg-rose-950/40 border-rose-800/80 text-rose-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold flex items-center gap-1.5">
                      {testResult.connected ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <span>{testResult.connected ? 'Model Connection Established' : 'Connection Failed / Unreachable'}</span>
                    </span>
                    <span>Status: {testResult.statusCode || 'N/A'}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Round-Trip Latency: <span className="text-slate-200 font-bold">{testResult.latencyMs} ms</span> · Tested At: {new Date(testResult.testedAt).toLocaleTimeString()}
                  </div>
                  {testResult.error && (
                    <div className="mt-1 text-[11px] text-rose-400">
                      Error details: {testResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Interactive Ingestion Playground */}
        <div className="lg:col-span-6 bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Send className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-xs font-bold text-slate-100 font-mono">
                    Direct Event Ingestion Sandbox
                  </h3>
                  <div className="text-[11px] text-slate-400 font-sans">
                    Dispatch JSON payloads directly into POST /api/v1/events
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
              Verify schema validation rules, confidence score bounds [0.0 - 1.0], latency recording, and immediate calculation trigger.
            </p>

            <textarea
              rows={8}
              value={manualEventJson}
              onChange={(e) => setManualEventJson(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-[11px] font-mono text-slate-100 focus:outline-none focus:border-amber-400 leading-relaxed"
            />

            <div className="flex items-center justify-between mt-3">
              <button
                onClick={handleManualIngest}
                className="flex items-center gap-2 py-2 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Transmit Prediction Event</span>
              </button>
              {manualIngestStatus && (
                <span className="text-[11px] font-mono text-slate-300">
                  {manualIngestStatus}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Code Snippets Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* cURL Ingestion */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-semibold text-slate-100 font-mono">cURL / HTTP CLI</h4>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(curlExample);
                  setCopiedCurl(true);
                  setTimeout(() => setCopiedCurl(false), 2000);
                }}
                className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-amber-400"
              >
                {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCurl ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-48">
              {curlExample}
            </pre>
          </div>
        </div>

        {/* Python SDK Ingestion */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-semibold text-slate-100 font-mono">Python Requests SDK</h4>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(pythonExample);
                  setCopiedPython(true);
                  setTimeout(() => setCopiedPython(false), 2000);
                }}
                className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-cyan-400"
              >
                {copiedPython ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPython ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-48">
              {pythonExample}
            </pre>
          </div>
        </div>

        {/* Node.js Fetch */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-semibold text-slate-100 font-mono">Node.js / TypeScript</h4>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(nodeExample);
                  setCopiedNode(true);
                  setTimeout(() => setCopiedNode(false), 2000);
                }}
                className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-purple-400"
              >
                {copiedNode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedNode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-48">
              {nodeExample}
            </pre>
          </div>
        </div>
      </div>

      {/* Immutable Audit Trail Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-3.5 border-b border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-slate-100 font-mono">
              Immutable Governance Audit Ledger
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              ({filteredLogs.length} entries)
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Filter audit logs..."
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            <select
              value={logSeverityFilter}
              onChange={(e) => setLogSeverityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
            >
              <option value="all">All Severities</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-mono text-[11px]">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Action Type</th>
                <th className="py-2.5 px-3">Audit Details</th>
                <th className="py-2.5 px-3 text-center">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-850/60 transition-colors">
                  <td className="py-2 px-3 text-slate-400 text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-slate-200 font-semibold">{log.actor}</td>
                  <td className="py-2 px-3 text-amber-400 font-semibold">{log.action}</td>
                  <td className="py-2 px-3 text-slate-300 font-sans text-xs">{log.details}</td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold ${
                        log.severity === 'critical'
                          ? 'text-rose-400 bg-rose-950/40 border border-rose-800/80'
                          : log.severity === 'warn'
                          ? 'text-amber-400 bg-amber-950/40 border border-amber-800/80'
                          : 'text-slate-400 bg-slate-900 border border-slate-800'
                      }`}
                    >
                      {log.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
