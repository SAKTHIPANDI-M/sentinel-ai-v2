import React, { useState } from 'react';
import { ModelRecord } from '../../types';
import {
  Layers,
  Plus,
  Server,
} from 'lucide-react';

interface ModelRegistryViewProps {
  models: ModelRecord[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  onOpenNewModelModal: () => void;
}

export const ModelRegistryView: React.FC<ModelRegistryViewProps> = ({
  models,
  selectedModelId,
  onSelectModel,
  onOpenNewModelModal,
}) => {
  const [selected, setSelected] = useState<ModelRecord>(
    models.find((m) => m.id === selectedModelId) || models[0]
  );

  const getStatusBadge = (status: ModelRecord['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/80';
      case 'watch':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/80';
      case 'degraded':
        return 'text-amber-400 bg-amber-950/50 border-amber-800/80';
      case 'critical':
        return 'text-rose-400 bg-rose-950/40 border-rose-800/80';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-800';
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6 max-w-7xl mx-auto w-full">
      {/* Top Banner */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <span>Production AI Model Registry</span>
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              CRUD &amp; Schema Governance
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Centralized metadata registry for enterprise machine learning models. Tracks task definitions, reference baseline datasets, monitored subgroup slicing keys, and active inference adapters without requiring weights upload.
          </p>
        </div>

        <button
          onClick={onOpenNewModelModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Model</span>
        </button>
      </div>

      {/* Grid: Models List & Model Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Model Cards List */}
        <div className="lg:col-span-5 flex flex-col gap-2.5">
          {models.map((m) => {
            const isCurrent = selected.id === m.id;
            return (
              <div
                key={m.id}
                onClick={() => {
                  setSelected(m);
                  onSelectModel(m.id);
                }}
                className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-slate-850/90 border-amber-400 shadow-sm'
                    : 'bg-[#111827] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-slate-100">
                      {m.name}
                    </span>
                    <span className="text-[10px] font-mono text-amber-400">
                      v{m.version}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${getStatusBadge(
                      m.status
                    )}`}
                  >
                    {m.status}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {m.description}
                </p>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-2.5 pt-2 border-t border-slate-800">
                  <span className="capitalize">{m.task.replace('_', ' ')}</span>
                  <span>Reliability: <strong className="text-amber-400">{m.reliabilityScore}/100</strong></span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Model Detail Panel */}
        <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="border-b border-slate-800 pb-3 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase">
                  Model Metadata Record
                </span>
                <h3 className="text-lg font-bold text-slate-100 mt-0.5">
                  {selected.name}
                </h3>
                <span className="text-xs font-mono text-amber-400">
                  Version: {selected.version} · ID: {selected.id}
                </span>
              </div>
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${getStatusBadge(
                  selected.status
                )}`}
              >
                {selected.status}
              </span>
            </div>

            {/* Description & Owner */}
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                Description &amp; Ownership
              </span>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {selected.description}
              </p>
              <div className="mt-2 text-[11px] text-slate-400 font-mono">
                Owner: <strong className="text-slate-200">{selected.owner}</strong> · Deployed:{' '}
                {new Date(selected.deployedAt).toLocaleDateString()}
              </div>
            </div>

            {/* Slicing Keys & Baseline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg">
                <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  Reference Dataset Baseline
                </span>
                <div className="text-xs font-mono font-semibold text-slate-200">
                  {selected.referenceDataset}
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg">
                <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  Monitored Slices
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selected.monitoredSegments.map((s) => (
                    <span
                      key={s}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-800"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Schemas */}
            <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg text-xs font-mono">
              <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1.5">
                Input Feature Schema
              </span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {Object.entries(selected.inputSchema).map(([k, v]) => (
                  <div key={k} className="bg-slate-950 p-1.5 rounded-md border border-slate-800 truncate">
                    <span className="text-amber-400 font-semibold">{k}:</span>{' '}
                    <span className="text-slate-400">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Endpoint */}
            <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg text-xs font-mono flex items-center justify-between">
              <div className="flex items-center gap-1.5 truncate">
                <Server className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="text-slate-400 text-[11px] truncate">
                  Adapter Endpoint: <strong className="text-slate-200">{selected.endpointUrl}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
