import React, { useState } from 'react';
import { ModelRecord, DatasetRecord } from '../types';
import { Database, ChevronDown } from 'lucide-react';
import { DatasetModal } from './DatasetModal';

interface DatasetSelectorProps {
  model?: ModelRecord;
  onDatasetChanged?: (dataset: DatasetRecord) => void;
}

export const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  model,
  onDatasetChanged,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!model) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-500 text-xs font-mono">
        <Database className="w-3.5 h-3.5 animate-pulse text-slate-600" />
        <span>Loading dataset...</span>
      </div>
    );
  }

  // Extract clean dataset title from referenceDataset
  const activeDatasetTitle = model.referenceDataset || 'Benchmark Baseline (N=50k)';
  const isDemo = activeDatasetTitle.includes('DEMO DATA') || Boolean(model.isDemo);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-100 hover:bg-slate-800 transition-all text-xs font-medium cursor-pointer shadow-xs active:scale-[0.98]"
        title="Manage active validation dataset, inspect schemas or upload CSV/JSON testing telemetry"
      >
        <div className="p-1 rounded bg-slate-800 border border-slate-700 text-cyan-400 shrink-0">
          <Database className="w-3.5 h-3.5" />
        </div>
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-100 max-w-[140px] sm:max-w-[180px] truncate">
              {activeDatasetTitle.replace(/\s*\[DEMO DATA\]|\s*\(N=.*?\)/g, '')}
            </span>
            {isDemo ? (
              <span className="text-[9px] font-mono font-semibold text-cyan-300 bg-cyan-950/70 border border-cyan-800/80 px-1 py-0.2 rounded shrink-0">
                DEMO DATA
              </span>
            ) : (
              <span className="text-[9px] font-mono font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-800/80 px-1 py-0.2 rounded shrink-0">
                VERIFIED
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {activeDatasetTitle.match(/\(N=.*?\)/)?.[0] || 'Active Cohort'} · Manage &amp; Upload
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-0.5" />
      </button>

      <DatasetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        model={model}
        onDatasetActivated={(dataset) => {
          if (onDatasetChanged) onDatasetChanged(dataset);
        }}
      />
    </>
  );
};
