import React, { useState } from 'react';
import { PredictionEvent, ModelRecord } from '../../types';
import { api } from '../../api';
import {
  Activity,
  Play,
  Pause,
  Send,
  CheckCircle2,
  AlertTriangle,
  Radio,
  FileCode,
} from 'lucide-react';

interface LiveTelemetryViewProps {
  model: ModelRecord;
  recentEvents: PredictionEvent[];
  isLiveConnected: boolean;
  onRefresh: () => void;
}

export const LiveTelemetryView: React.FC<LiveTelemetryViewProps> = ({
  model,
  recentEvents,
  onRefresh,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [showManualIngest, setShowManualIngest] = useState(false);
  const [ingestJson, setIngestJson] = useState(`{
  "model_id": "${model.id}",
  "model_version": "${model.version}",
  "input_features": {
    "age": 72,
    "systolic_bp": 145,
    "total_cholesterol": 230,
    "smoking_status": 1
  },
  "prediction": "high_risk",
  "actual_label": "high_risk",
  "confidence": 0.94,
  "latency_ms": 115,
  "segment_attributes": {
    "age_group": "65+",
    "care_facility": "Metropolitan General"
  }
}`);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleManualIngest = async () => {
    try {
      setIsSubmitting(true);
      setIngestStatus(null);
      const parsed = JSON.parse(ingestJson);
      const res = await api.ingestPrediction(parsed);
      setIngestStatus(`Success (201): Event ${res.event_id || res.accepted_count || 'OK'} processed and evaluated.`);
      onRefresh();
    } catch (err: any) {
      setIngestStatus(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInjectBurst = async (type: 'silent_failure' | 'drift_surge') => {
    try {
      await api.injectAnomalyBurst(model.id, type);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6 max-w-7xl mx-auto w-full">
      {/* Top Controls */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <span>Real-Time Ingestion &amp; Live Telemetry Feed</span>
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400">
              Server-Sent Events (SSE) Stream
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Streaming inference events are continuously validated with Pydantic-grade schemas, written to the event buffer, and dynamically evaluated for subgroup disparities and distribution drift.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              isPaused
                ? 'bg-amber-950/40 text-amber-400 border-amber-800/80'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5 text-slate-400" />}
            <span>{isPaused ? 'Resume Stream' : 'Pause Stream'}</span>
          </button>

          <button
            onClick={() => setShowManualIngest(!showManualIngest)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Test Ingestion API</span>
          </button>
        </div>
      </div>

      {/* Manual Ingestion API Tester Drawer */}
      {showManualIngest && (
        <div className="bg-[#111827] border border-amber-400/40 rounded-xl p-5 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
            <div>
              <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                <FileCode className="w-4 h-4 text-amber-400" />
                <span>Single / Batch Ingestion API Simulator</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                POST to <code className="text-amber-400 font-mono">/api/v1/events</code> with schema validation and real-time metric triggering
              </p>
            </div>
            <button
              onClick={() => setShowManualIngest(false)}
              className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md transition-colors"
            >
              Close
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <textarea
              value={ingestJson}
              onChange={(e) => setIngestJson(e.target.value)}
              rows={8}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-100 focus:outline-none focus:border-amber-400"
            />

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleManualIngest}
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Ingesting...' : 'Send Event to /api/ingest'}
                </button>
                <button
                  onClick={() => handleInjectBurst('silent_failure')}
                  className="px-3.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-800/80 text-xs font-semibold rounded-lg transition-colors"
                >
                  Inject 15 Silent Failure Records
                </button>
              </div>

              {ingestStatus && (
                <span className={`text-xs font-mono ${ingestStatus.startsWith('Error') ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {ingestStatus}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Streaming Events Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-3.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-slate-100">
              Live Incoming Inferences ({recentEvents.length} buffered)
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {isPaused ? '• STREAM PAUSED' : '• AUTO-POLLING & STREAMING'}
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Model: <span className="text-slate-200">{model.name}</span> ({model.version})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-mono text-[11px]">
                <th className="py-2.5 px-3">Event ID</th>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Prediction</th>
                <th className="py-2.5 px-3">Ground Truth</th>
                <th className="py-2.5 px-3 text-right">Confidence</th>
                <th className="py-2.5 px-3 text-right">Latency</th>
                <th className="py-2.5 px-3">Segments</th>
                <th className="py-2.5 px-3 text-center">Match</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {recentEvents.map((ev) => {
                const hasLabel = ev.groundTruth !== undefined && ev.groundTruth !== null;
                const isMatch = hasLabel && String(ev.prediction) === String(ev.groundTruth);
                return (
                  <tr key={ev.eventId} className="hover:bg-slate-850/60 transition-colors">
                    <td className="py-2 px-3 text-cyan-400 font-semibold">{ev.eventId}</td>
                    <td className="py-2 px-3 text-slate-400 text-[11px]">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3 text-slate-200 font-bold">{String(ev.prediction)}</td>
                    <td className="py-2 px-3">
                      {hasLabel ? (
                        <span className="text-slate-200">{String(ev.groundTruth)}</span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Pending</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400">
                      {(ev.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className={ev.latencyMs > 250 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                        {ev.latencyMs}ms
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(ev.segments || {}).map(([k, v]) => (
                          <span
                            key={k}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              v === '65+'
                                ? 'bg-rose-950/40 text-rose-400 border border-rose-800/80 font-semibold'
                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                            }`}
                          >
                            {k}:{v}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {!hasLabel ? (
                        <span className="text-[10px] text-slate-500">-</span>
                      ) : isMatch ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 inline" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
