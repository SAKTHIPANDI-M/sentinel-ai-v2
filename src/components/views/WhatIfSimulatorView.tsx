import React, { useState } from 'react';
import { ModelRecord } from '../../types';
import { api } from '../../api';
import {
  Sliders,
  Play,
  RotateCcw,
} from 'lucide-react';

interface WhatIfSimulatorViewProps {
  model: ModelRecord;
}

export const WhatIfSimulatorView: React.FC<WhatIfSimulatorViewProps> = ({ model }) => {
  const [driftPsi, setDriftPsi] = useState<number>(0.15);
  const [subgroupErrorSpike, setSubgroupErrorSpike] = useState<number>(25);
  const [trafficSurge, setTrafficSurge] = useState<number>(2.0);
  const [latencyMultiplier, setLatencyMultiplier] = useState<number>(1.8);

  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = async () => {
    try {
      setIsSimulating(true);
      const res = await api.runSimulation({
        modelId: model.id,
        injectedDriftPsi: driftPsi,
        subgroupErrorSpikePct: subgroupErrorSpike,
        trafficSurgeFactor: trafficSurge,
        latencyMultiplier: latencyMultiplier,
      });
      setSimulationResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleReset = () => {
    setDriftPsi(0.15);
    setSubgroupErrorSpike(25);
    setTrafficSurge(2.0);
    setLatencyMultiplier(1.8);
    setSimulationResult(null);
  };

  return (
    <div className="flex flex-col gap-5 p-6 max-w-7xl mx-auto w-full">
      {/* Notice Banner */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              <span>What-If Reliability &amp; Stress Simulator</span>
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold">
              SANDBOX SIMULATION — NOT PRODUCTION DATA
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Hypothetically stress test AI models under synthetic data drift, subgroup degradation, traffic surges, and latency penalties. Preemptively model SLA breaches and observe the composite Reliability Score response.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-lg border border-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Sliders</span>
          </button>
          <button
            onClick={runSimulation}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-all shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isSimulating ? 'Computing Stress Model...' : 'Simulate Stress'}</span>
          </button>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Slider 1: Feature Drift PSI */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-100">Injected Feature PSI</span>
              <span className="font-mono text-amber-400 font-bold">+{driftPsi.toFixed(2)}</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Synthetic distribution shift added to input features.
            </p>
          </div>
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.01"
            value={driftPsi}
            onChange={(e) => setDriftPsi(parseFloat(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer"
          />
        </div>

        {/* Slider 2: Subgroup Error Spike */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-100">Subgroup Failure Spike</span>
              <span className="font-mono text-rose-400 font-bold">+{subgroupErrorSpike}%</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Degradation localized to minority demographic slice.
            </p>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="1"
            value={subgroupErrorSpike}
            onChange={(e) => setSubgroupErrorSpike(parseInt(e.target.value))}
            className="w-full accent-rose-400 cursor-pointer"
          />
        </div>

        {/* Slider 3: Traffic Surge */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-100">Traffic Surge Factor</span>
              <span className="font-mono text-cyan-400 font-bold">{trafficSurge.toFixed(1)}x</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Sudden inference concurrency multiplier.
            </p>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="0.5"
            value={trafficSurge}
            onChange={(e) => setTrafficSurge(parseFloat(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </div>

        {/* Slider 4: Latency Multiplier */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-100">Latency Penalty</span>
              <span className="font-mono text-slate-200 font-bold">{latencyMultiplier.toFixed(1)}x</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Backend upstream delay and network queueing.
            </p>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            step="0.1"
            value={latencyMultiplier}
            onChange={(e) => setLatencyMultiplier(parseFloat(e.target.value))}
            className="w-full accent-slate-300 cursor-pointer"
          />
        </div>
      </div>

      {/* Simulation Output Area */}
      {simulationResult ? (
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-mono text-amber-400 uppercase font-semibold">
                Projected Simulation Results
              </span>
              <h3 className="text-base font-bold text-slate-100 mt-0.5">
                Stress Scenario Impact on {model.name}
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Deterministic Evaluation Engine
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Projected Score */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">
                Projected Reliability Score
              </span>
              <div className="text-3xl font-extrabold font-mono text-slate-100 mt-1">
                {simulationResult.projectedScore}
                <span className="text-xs text-rose-400 font-normal ml-2 font-mono">
                  ({simulationResult.delta} pts)
                </span>
              </div>
              <span className="text-[10px] font-mono text-rose-400 uppercase block mt-1">
                Status: {simulationResult.projectedStatus}
              </span>
            </div>

            {/* Projected Latency */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">
                Projected P95 Latency
              </span>
              <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
                {simulationResult.projectedP95}ms
              </div>
              <span className="text-[10px] font-mono text-slate-500 block mt-1">
                {simulationResult.projectedP95 > 250 ? 'Breaches 250ms SLA' : 'Within SLA'}
              </span>
            </div>

            {/* Projected Drift */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">
                Projected Total PSI
              </span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {simulationResult.projectedDrift.toFixed(3)}
              </div>
              <span className="text-[10px] font-mono text-slate-500 block mt-1">
                Threshold: 0.250
              </span>
            </div>

            {/* Projected Alerts */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">
                Projected Incidents
              </span>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
                {simulationResult.projectedIncidentsCount}
              </div>
              <span className="text-[10px] font-mono text-slate-500 block mt-1">
                {simulationResult.projectedTriggeredRules.length} newly triggered
              </span>
            </div>
          </div>

          {/* Triggered Incident Projection */}
          {simulationResult.projectedTriggeredRules.length > 0 && (
            <div className="bg-rose-950/20 border border-rose-800/80 rounded-lg p-3 text-xs">
              <span className="font-semibold text-rose-400 block mb-1">
                Alerts that would be fired under this stress profile:
              </span>
              <ul className="list-disc list-inside space-y-1 text-slate-400 font-mono text-[11px]">
                {simulationResult.projectedTriggeredRules.map((r: string, idx: number) => (
                  <li key={idx}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-400">
          Adjust the sliders above and click <strong className="text-amber-400">Simulate Stress</strong> to model the impact on reliability and incident triggers.
        </div>
      )}
    </div>
  );
};
