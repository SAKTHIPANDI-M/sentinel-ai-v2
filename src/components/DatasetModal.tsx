import React, { useState, useEffect } from 'react';
import { ModelRecord, DatasetRecord } from '../types';
import { api } from '../api';
import {
  Database,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Layers,
  ArrowRight,
  Info,
  Check,
  X,
  FileCode,
  Table,
  Sparkles,
} from 'lucide-react';

interface DatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  model?: ModelRecord;
  onDatasetActivated: (dataset: DatasetRecord) => void;
}

export const DatasetModal: React.FC<DatasetModalProps> = ({
  isOpen,
  onClose,
  model,
  onDatasetActivated,
}) => {
  const [activeTab, setActiveTab] = useState<'available' | 'upload' | 'inspector'>('available');
  const [datasets, setDatasets] = useState<DatasetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>(model?.activeDatasetId || '');

  // Upload Form State
  const [uploadName, setUploadName] = useState('');
  const [uploadFormat, setUploadFormat] = useState<'csv' | 'json' | 'jsonl'>('csv');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen && model?.id) {
      loadDatasets();
    }
  }, [isOpen, model?.id]);

  const loadDatasets = async () => {
    if (!model) return;
    try {
      setIsLoading(true);
      const list = await api.getModelDatasets(model.id);
      setDatasets(list);
      if (!selectedDatasetId && list.length > 0) {
        setSelectedDatasetId(model.activeDatasetId || list[0].id);
      }
    } catch (e) {
      console.error('Failed to load datasets:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDataset = async (dataset: DatasetRecord) => {
    if (!model) return;
    try {
      setIsLoading(true);
      const res = await api.selectDataset(model.id, dataset.id);
      setSelectedDatasetId(dataset.id);
      onDatasetActivated(res.dataset);
    } catch (err: any) {
      console.error('Failed to switch dataset:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadName(file.name.replace(/\.[^/.]+$/, ''));
    if (file.name.endsWith('.jsonl')) setUploadFormat('jsonl');
    else if (file.name.endsWith('.json')) setUploadFormat('json');
    else setUploadFormat('csv');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setUploadContent(text);
      setUploadError(null);
    };
    reader.onerror = () => {
      setUploadError('Failed to read file from disk.');
    };
    reader.readAsText(file);
  };

  const handleRunValidationAndUpload = async () => {
    if (!model) return;
    setUploadError(null);
    setUploadSuccess(null);
    setValidationResult(null);

    if (!uploadContent.trim()) {
      setUploadError('Please select a file or paste dataset content to upload.');
      return;
    }

    try {
      setIsUploading(true);
      const res = await api.uploadDataset(model.id, {
        name: uploadName.trim() || `Dataset_${Date.now()}`,
        fileFormat: uploadFormat,
        content: uploadContent,
        description: uploadDescription || `Uploaded dataset for ${model.name}`,
      });

      if (res.validation?.isValid) {
        setUploadSuccess(`Dataset "${res.dataset.name}" validated and activated successfully!`);
        setValidationResult(res.validation);
        setDatasets((prev) => [res.dataset, ...prev]);
        setSelectedDatasetId(res.dataset.id);
        onDatasetActivated(res.dataset);
      } else {
        setValidationResult(res.validation);
        setUploadError(
          `Schema validation failed: Missing required feature column(s): ${res.validation.missingRequiredColumns.join(', ')}`
        );
      }
    } catch (err: any) {
      setUploadError(err.message || 'Dataset processing failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLoadSampleCSV = () => {
    if (!model) return;
    const feat = model.features && model.features.length ? model.features : ['feature_x1', 'feature_x2', 'feature_x3'];
    const header = `${feat.join(',')},groundTruth`;
    const rows = [
      `${feat.map((_, i) => (10 + i * 5).toFixed(1)).join(',')},positive`,
      `${feat.map((_, i) => (22 + i * 4).toFixed(1)).join(',')},negative`,
      `${feat.map((_, i) => (15 + i * 3).toFixed(1)).join(',')},positive`,
      `${feat.map((_, i) => (8 + i * 2).toFixed(1)).join(',')},positive`,
      `${feat.map((_, i) => (30 + i * 6).toFixed(1)).join(',')},negative`,
    ];
    setUploadName(`Synthesized_${model.id}_Eval_Batch`);
    setUploadFormat('csv');
    setUploadContent(`${header}\n${rows.join('\n')}`);
    setUploadDescription(`Synthetic test batch with ground-truth for ${model.name}`);
    setUploadError(null);
  };

  if (!isOpen || !model) return null;

  const currentDataset = datasets.find((d) => d.id === selectedDatasetId) || datasets[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0E131F] border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Dataset Management &amp; Validation</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {model.domain}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Target Model: <strong className="text-slate-200">{model.name}</strong> ({model.version})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-800/80 bg-slate-950/40 text-xs">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex items-center gap-2 pb-2.5 px-3 font-semibold transition-all border-b-2 ${
              activeTab === 'available'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Available Datasets ({datasets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 pb-2.5 px-3 font-semibold transition-all border-b-2 ${
              activeTab === 'upload'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload &amp; Validate (CSV / JSON)</span>
          </button>

          <button
            onClick={() => setActiveTab('inspector')}
            className={`flex items-center gap-2 pb-2.5 px-3 font-semibold transition-all border-b-2 ${
              activeTab === 'inspector'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>Active Dataset Schema &amp; Preview</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
          {/* TAB 1: AVAILABLE DATASETS */}
          {activeTab === 'available' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Select a calibrated evaluation benchmark or upload real testing telemetry.</span>
                <span className="font-mono text-cyan-400">
                  Active: <strong>{currentDataset?.name || 'None selected'}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {datasets.map((ds) => {
                  const isActive = ds.id === selectedDatasetId;
                  return (
                    <div
                      key={ds.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isActive
                          ? 'bg-cyan-950/20 border-cyan-500/80 ring-1 ring-cyan-500/30'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                            isActive
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          <Database className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-100">{ds.name}</span>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {ds.fileFormat}
                            </span>
                            {ds.isDemo ? (
                              <span className="text-[9px] font-mono font-semibold text-cyan-300 bg-cyan-950/70 border border-cyan-800/80 px-1.5 py-0.2 rounded">
                                DEMO DATA
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-800/80 px-1.5 py-0.2 rounded">
                                USER UPLOADED
                              </span>
                            )}
                            {ds.hasGroundTruth ? (
                              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800">
                                Verified Labels: {ds.labelColumn}
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800">
                                Unlabeled Ingestion
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-400 mt-1">{ds.description}</p>

                          <div className="flex items-center gap-4 mt-2 text-[11px] font-mono text-slate-400 flex-wrap">
                            <span>Records: <strong className="text-slate-200">{ds.recordCount.toLocaleString()}</strong></span>
                            <span>·</span>
                            <span>Features: <strong className="text-slate-200">{ds.featureCount} dims</strong></span>
                            <span>·</span>
                            <span>Source: <strong className="text-slate-200">{ds.source}</strong></span>
                            {ds.metrics?.accuracy && (
                              <>
                                <span>·</span>
                                <span>Empirical Accuracy: <strong className="text-emerald-400">{(ds.metrics.accuracy * 100).toFixed(1)}%</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                        {isActive ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-xs font-semibold">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Active Dataset</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSelectDataset(ds)}
                            disabled={isLoading}
                            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
                          >
                            Select &amp; Evaluate
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD & VALIDATE */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Schema Compatibility Requirements</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Your file must contain columns matching the model's required inputs:
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {model.features.map((f) => (
                      <code
                        key={f}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800 font-semibold"
                      >
                        {f}
                      </code>
                    ))}
                    <span className="text-[11px] text-slate-500 ml-1">+ optional groundTruth / label column</span>
                  </div>
                </div>

                <button
                  onClick={handleLoadSampleCSV}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-amber-400 border border-amber-500/40 rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Fill Sample Compatible CSV</span>
                </button>
              </div>

              {/* Upload Drop Zone / Input */}
              <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-6 text-center bg-slate-950/40 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  accept=".csv,.json,.jsonl"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 shadow-sm">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200 underline">
                      Choose CSV or JSON file
                    </span>
                    <span className="text-xs text-slate-400"> or drag and drop here</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Supports .csv, .json, .jsonl (Max 15MB)
                  </span>
                </label>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Dataset Name
                  </label>
                  <input
                    type="text"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="e.g., Q3_Production_Cohort"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    File Format
                  </label>
                  <select
                    value={uploadFormat}
                    onChange={(e) => setUploadFormat(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                  >
                    <option value="csv">CSV (Comma-Separated Values)</option>
                    <option value="json">JSON (Array of Objects)</option>
                    <option value="jsonl">JSONL (JSON Lines)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Raw Content Preview / Editor
                </label>
                <textarea
                  rows={5}
                  value={uploadContent}
                  onChange={(e) => setUploadContent(e.target.value)}
                  placeholder="Paste CSV rows with header or JSON items..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-200 focus:outline-none focus:border-cyan-400 custom-scrollbar"
                />
              </div>

              {/* Status Alert Messages */}
              {uploadError && (
                <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Validation Error:</span>
                    <span>{uploadError}</span>
                  </div>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              {/* Action Button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleRunValidationAndUpload}
                  disabled={isUploading}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{isUploading ? 'Validating Schema...' : 'Validate Schema & Ingest Dataset'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVE DATASET INSPECTOR */}
          {activeTab === 'inspector' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{currentDataset?.name}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">{currentDataset?.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2 py-1 rounded bg-slate-950 text-cyan-400 border border-slate-800">
                    {currentDataset?.recordCount.toLocaleString()} total rows
                  </span>
                  <span className="text-[11px] font-mono px-2 py-1 rounded bg-slate-950 text-slate-300 border border-slate-800">
                    {currentDataset?.featureCount} columns
                  </span>
                </div>
              </div>

              {/* Schema comparison table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60">
                <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Required Feature Dimensions vs Dataset Columns</span>
                  <span className="text-[10px] font-mono text-emerald-400">Schema Check: 100% Compatible</span>
                </div>
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {currentDataset?.features.map((feat) => {
                    const isRequired = model.features.includes(feat);
                    const isGT = feat === currentDataset.labelColumn;
                    return (
                      <div
                        key={feat}
                        className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <span className="font-mono text-slate-200">{feat}</span>
                        {isGT ? (
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800">
                            Ground Truth
                          </span>
                        ) : isRequired ? (
                          <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800">
                            Model Input
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                            Attribute
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sample Data Table Preview */}
              {currentDataset?.samplePreview && currentDataset.samplePreview.length > 0 && (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                  <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs font-semibold text-slate-300">
                    Data Sample Preview (First 5 Rows)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] font-mono">
                      <thead className="bg-slate-900/70 border-b border-slate-800 text-slate-400">
                        <tr>
                          {Object.keys(currentDataset.samplePreview[0] || {}).map((col) => (
                            <th key={col} className="p-2.5 font-semibold">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {currentDataset.samplePreview.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-900/40 text-slate-200">
                            {Object.values(row).map((val: any, j) => (
                              <td key={j} className="p-2.5">
                                {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-slate-500" />
            <span>Sample and synthetic datasets are clearly labelled DEMO DATA.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
