import React, { useState } from 'react';
import { Incident } from '../../types';
import { api } from '../../api';
import {
  AlertTriangle,
  Filter,
  MessageSquare,
  Bot,
  Fingerprint,
} from 'lucide-react';

interface IncidentsViewProps {
  incidents: Incident[];
  onRefresh: () => void;
  onLaunchAssistant: (prompt: string) => void;
}

export const IncidentsView: React.FC<IncidentsViewProps> = ({
  incidents,
  onRefresh,
  onLaunchAssistant,
}) => {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    incidents[0] || null
  );
  const [commentText, setCommentText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (id: string, newStatus: Incident['status']) => {
    try {
      setIsUpdating(true);
      const updated = await api.updateIncidentStatus(id, newStatus);
      if (selectedIncident?.id === id) {
        setSelectedIncident(updated);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !commentText.trim()) return;

    try {
      setIsUpdating(true);
      const updated = await api.addIncidentComment(
        selectedIncident.id,
        'Lead MLOps Engineer',
        commentText.trim()
      );
      setSelectedIncident(updated);
      setCommentText('');
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const getSeverityBadge = (sev: Incident['severity']) => {
    switch (sev) {
      case 'critical':
        return 'text-rose-400 bg-rose-950/40 border-rose-800/80';
      case 'high':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/80';
      case 'medium':
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-800/80';
      case 'low':
        return 'text-slate-300 bg-slate-800 border-slate-700';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-800';
    }
  };

  const getStatusBadge = (status: Incident['status']) => {
    switch (status) {
      case 'open':
        return 'text-rose-400 bg-rose-950/40 border-rose-800/80';
      case 'investigating':
        return 'text-amber-400 bg-amber-950/40 border-amber-800/80';
      case 'acknowledged':
        return 'text-cyan-400 bg-cyan-950/40 border-cyan-800/80';
      case 'resolved':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/80';
      case 'suppressed':
        return 'text-slate-400 bg-slate-900 border-slate-800';
    }
  };

  const filtered = incidents.filter(
    (i) => statusFilter === 'all' || i.status === statusFilter
  );

  return (
    <div className="flex flex-col gap-5 p-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span>Incident Management &amp; Reliability Alert Engine</span>
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              Audit-Enforced
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Automated alert deduplication, cooldown policies, and failure fingerprint grouping. Every incident carries empirical statistical metrics, affected slice attributes, and direct suggested mitigations.
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
          >
            <option value="all">All Statuses ({incidents.length})</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
            <option value="suppressed">Suppressed</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Incident List on Left, Detail & Actions on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Incident List */}
        <div className="lg:col-span-5 flex flex-col gap-2.5">
          {filtered.map((inc) => {
            const isSelected = selectedIncident?.id === inc.id;
            return (
              <div
                key={inc.id}
                onClick={() => setSelectedIncident(inc)}
                className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-slate-850/90 border-amber-400 shadow-sm'
                    : 'bg-[#111827] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-mono text-[11px] text-cyan-400 font-bold">
                    {inc.id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border font-semibold ${getSeverityBadge(
                        inc.severity
                      )}`}
                    >
                      {inc.severity}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border font-semibold ${getStatusBadge(
                        inc.status
                      )}`}
                    >
                      {inc.status}
                    </span>
                  </div>
                </div>

                <h4 className="text-xs font-semibold text-slate-100 line-clamp-2">
                  {inc.title}
                </h4>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-2 pt-2 border-t border-slate-800">
                  <span>Model: <span className="text-slate-200">{inc.modelId}</span></span>
                  <span>{inc.occurrenceCount} Occurrences</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Incident Inspector */}
        <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          {selectedIncident ? (
            <div className="flex flex-col gap-4">
              {/* Header */}
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-amber-400 font-bold">
                      {selectedIncident.id}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${getSeverityBadge(
                        selectedIncident.severity
                      )}`}
                    >
                      {selectedIncident.severity}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${getStatusBadge(
                        selectedIncident.status
                      )}`}
                    >
                      {selectedIncident.status}
                    </span>
                  </div>

                  {/* Status Transition Actions */}
                  <div className="flex items-center gap-1">
                    {(['investigating', 'acknowledged', 'resolved', 'suppressed'] as const).map(
                      (st) =>
                        selectedIncident.status !== st && (
                          <button
                            key={st}
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(selectedIncident.id, st)}
                            className="px-2 py-1 text-[10px] font-mono uppercase rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
                          >
                            Mark {st}
                          </button>
                        )
                    )}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-100 mt-2">
                  {selectedIncident.title}
                </h3>
              </div>

              {/* Failure Fingerprint */}
              {selectedIncident.failureFingerprint && (
                <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-lg flex items-center gap-2 text-xs">
                  <Fingerprint className="w-4 h-4 text-purple-400 shrink-0" />
                  <span className="text-slate-400 text-[11px]">Failure Fingerprint:</span>
                  <code className="text-purple-300 font-mono font-semibold text-[11px]">
                    {selectedIncident.failureFingerprint}
                  </code>
                </div>
              )}

              {/* Description */}
              <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                {selectedIncident.description}
              </p>

              {/* Supporting Metrics */}
              <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-lg">
                <span className="text-[10px] font-mono text-slate-400 uppercase block mb-1.5">
                  Supporting Empirical Telemetry:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                  {Object.entries(selectedIncident.supportingMetrics).map(([k, v]) => (
                    <div key={k} className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block truncate">{k}</span>
                      <span className="font-bold text-slate-200 mt-0.5 block truncate">
                        {String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested Action & AI Consultation */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div>
                  <span className="text-[10px] font-mono text-amber-400 uppercase block">
                    Recommended Mitigation:
                  </span>
                  <span className="text-xs font-bold text-slate-200 uppercase font-mono">
                    {selectedIncident.suggestedAction.replace('_', ' ')}
                  </span>
                </div>

                <button
                  onClick={() =>
                    onLaunchAssistant(
                      `What are the investigation steps and mitigation actions for incident ${selectedIncident.id}: ${selectedIncident.title}?`
                    )
                  }
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-950/40 hover:bg-purple-900/40 border border-purple-800/80 text-purple-200 text-xs font-semibold rounded-lg transition-colors shadow-xs"
                >
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                  <span>Investigate with AI</span>
                </button>
              </div>

              {/* Incident Comments & Audit Trail */}
              <div className="border-t border-slate-800 pt-3 flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>Investigation Notes &amp; Audit Comments</span>
                </span>

                <div className="max-h-40 overflow-y-auto flex flex-col gap-2 pr-1">
                  {selectedIncident.comments.map((c) => (
                    <div key={c.id} className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-xs">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                        <span className="font-bold text-slate-200">{c.author}</span>
                        <span>{new Date(c.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{c.text}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddComment} className="flex gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Add audit note or investigation comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={isUpdating || !commentText.trim()}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                  >
                    Post Note
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              Select an incident to view details and audit history.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
