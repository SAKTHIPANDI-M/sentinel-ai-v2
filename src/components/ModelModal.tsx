import React, { useState } from 'react';
import { ModelRecord, ModelTask, Environment } from '../types';
import { api } from '../api';
import { X, Layers, Plus } from 'lucide-react';

interface ModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModelCreated: (model: ModelRecord) => void;
}

export const ModelModal: React.FC<ModelModalProps> = ({
  isOpen,
  onClose,
  onModelCreated,
}) => {
  const [name, setName] = useState('');
  const [task, setTask] = useState<ModelTask>('classification');
  const [version, setVersion] = useState('1.0.0');
  const [environment, setEnvironment] = useState<Environment>('production');
  const [owner, setOwner] = useState('Lead MLOps Engineer');
  const [description, setDescription] = useState('');
  const [referenceDataset, setReferenceDataset] = useState('Baseline-Production-Benchmark-v1');
  const [segments, setSegments] = useState('region, device_tier, user_segment');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-v${version}`;
      const newModel: Partial<ModelRecord> = {
        id,
        name: name.trim(),
        task,
        version,
        environment,
        owner,
        description: description.trim() || 'Custom registered machine learning service.',
        referenceDataset,
        monitoredSegments: segments.split(',').map((s) => s.trim()).filter(Boolean),
        status: 'healthy',
        reliabilityScore: 88,
        deployedAt: new Date().toISOString(),
        features: ['feature_1', 'feature_2', 'feature_3'],
        inputSchema: { feature_1: 'number', feature_2: 'string' },
        outputSchema: { prediction: 'categorical', confidence: 'float' },
        endpointUrl: `https://inference.internal.sentinel/v1/${id}/predict`,
        summaryMetrics: {
          accuracy: 0.92,
          f1Score: 0.89,
          p95LatencyMs: 120,
          errorRate: 0.01,
          predictionVolume24h: 1200,
          driftScore: 0.08,
          predictionDriftScore: 0.06,
          uncertaintyRate: 0.05,
          openIncidentsCount: 0,
        },
      };

      const created = await api.createModel(newModel);
      onModelCreated(created);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-[#111827] border border-slate-750 rounded-lg max-w-lg w-full p-5 shadow-2xl animate-in fade-in duration-150">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-sm">Register Production AI Model</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Model Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Loan Default Predictor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Task Type</label>
              <select
                value={task}
                onChange={(e) => setTask(e.target.value as ModelTask)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-400"
              >
                <option value="classification">Classification</option>
                <option value="regression">Regression</option>
                <option value="nlp_llm">NLP / LLM</option>
                <option value="computer_vision">Computer Vision</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Version</label>
              <input
                type="text"
                required
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Environment</label>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as Environment)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-400"
              >
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="development">Development</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Model Owner</label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Reference Dataset Baseline</label>
            <input
              type="text"
              value={referenceDataset}
              onChange={(e) => setReferenceDataset(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              Monitored Subgroup Slices (Comma-separated)
            </label>
            <input
              type="text"
              value={segments}
              onChange={(e) => setSegments(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 font-mono text-[11px] focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Clinical risk scoring model or financial fraud detector..."
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-slate-100 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold rounded transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Registering...' : 'Register Model'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
