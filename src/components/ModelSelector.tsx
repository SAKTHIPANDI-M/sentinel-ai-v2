import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ModelRecord, ModelDomain, ModelStatus } from '../types';
import {
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  Landmark,
  HeartPulse,
  ShoppingBag,
  Bot,
  Scan,
  ShieldAlert,
  Cpu,
  GraduationCap,
  Truck,
  Binary,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';

interface ModelSelectorProps {
  models: ModelRecord[];
  selectedModelId: string;
  onSelectModel: (id: string) => void;
}

export const DOMAIN_ICONS: Record<string, React.ElementType> = {
  'Banking & Finance': Landmark,
  'Healthcare': HeartPulse,
  'E-commerce & Retail': ShoppingBag,
  'NLP & Generative AI': Bot,
  'Computer Vision': Scan,
  'Cybersecurity': ShieldAlert,
  'Manufacturing & IoT': Cpu,
  'Education': GraduationCap,
  'Transportation & Logistics': Truck,
  'General Machine Learning': Binary,
};

export const DOMAIN_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  'Banking & Finance': { text: 'text-amber-400', bg: 'bg-amber-950/40', border: 'border-amber-800/60' },
  'Healthcare': { text: 'text-rose-400', bg: 'bg-rose-950/40', border: 'border-rose-800/60' },
  'E-commerce & Retail': { text: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-800/60' },
  'NLP & Generative AI': { text: 'text-violet-400', bg: 'bg-violet-950/40', border: 'border-violet-800/60' },
  'Computer Vision': { text: 'text-cyan-400', bg: 'bg-cyan-950/40', border: 'border-cyan-800/60' },
  'Cybersecurity': { text: 'text-red-400', bg: 'bg-red-950/40', border: 'border-red-800/60' },
  'Manufacturing & IoT': { text: 'text-orange-400', bg: 'bg-orange-950/40', border: 'border-orange-800/60' },
  'Education': { text: 'text-indigo-400', bg: 'bg-indigo-950/40', border: 'border-indigo-800/60' },
  'Transportation & Logistics': { text: 'text-blue-400', bg: 'bg-blue-950/40', border: 'border-blue-800/60' },
  'General Machine Learning': { text: 'text-teal-400', bg: 'bg-teal-950/40', border: 'border-teal-800/60' },
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModelId,
  onSelectModel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('All');
  const [collapsedDomains, setCollapsedDomains] = useState<Record<string, boolean>>({});
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Group models by domain
  const domains = useMemo(() => {
    const list: string[] = [];
    models.forEach((m) => {
      const d = m.domain || 'General Machine Learning';
      if (!list.includes(d)) list.push(d);
    });
    return list;
  }, [models]);

  // Filtered models
  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      const d = m.domain || 'General Machine Learning';
      if (selectedDomainFilter !== 'All' && d !== selectedDomainFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.version.toLowerCase().includes(q) ||
        m.task.toLowerCase().includes(q) ||
        d.toLowerCase().includes(q) ||
        (m.description && m.description.toLowerCase().includes(q))
      );
    });
  }, [models, selectedDomainFilter, searchQuery]);

  // Models grouped by domain from filtered list
  const groupedFiltered = useMemo(() => {
    const map: Record<string, ModelRecord[]> = {};
    filteredModels.forEach((m) => {
      const d = m.domain || 'General Machine Learning';
      if (!map[d]) map[d] = [];
      map[d].push(m);
    });
    return map;
  }, [filteredModels]);

  // Flat list for keyboard navigation
  const flatVisibleModels = useMemo(() => {
    const list: ModelRecord[] = [];
    Object.entries(groupedFiltered).forEach(([domain, mList]) => {
      if (!collapsedDomains[domain]) {
        list.push(...mList);
      }
    });
    return list;
  }, [groupedFiltered, collapsedDomains]);

  const toggleDomainCollapse = (domain: string) => {
    setCollapsedDomains((prev) => ({
      ...prev,
      [domain]: !prev[domain],
    }));
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev < flatVisibleModels.length - 1 ? prev + 1 : 0;
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : flatVisibleModels.length - 1;
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < flatVisibleModels.length) {
        onSelectModel(flatVisibleModels[highlightedIndex].id);
        setIsOpen(false);
      }
    }
  };

  const getStatusBadge = (status: ModelStatus) => {
    switch (status) {
      case 'healthy':
        return <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/20 inline-block" title="Status: Healthy" />;
      case 'watch':
        return <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-500/20 inline-block" title="Status: Watch (Elevated Drift)" />;
      case 'degraded':
        return <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-amber-500/20 inline-block" title="Status: Degraded (Subgroup Failure)" />;
      case 'critical':
        return <span className="w-2 h-2 rounded-full bg-rose-400 ring-2 ring-rose-500/30 animate-pulse inline-block" title="Status: Critical Regression" />;
      default:
        return <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" title="Status: Inactive / Not Connected" />;
    }
  };

  const SelectedDomainIcon = DOMAIN_ICONS[selectedModel?.domain || ''] || Layers;

  return (
    <div className="relative" ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border transition-all text-xs font-medium cursor-pointer shadow-xs active:scale-[0.98] ${
          isOpen
            ? 'bg-slate-800 border-amber-400/80 ring-2 ring-amber-400/20 text-white'
            : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-100 hover:bg-slate-800'
        }`}
        title="Switch AI model across 10 industry domains"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-slate-800 border border-slate-700 text-amber-400 shrink-0">
            <SelectedDomainIcon className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-100 max-w-[170px] sm:max-w-[210px] truncate">
                {selectedModel?.name || 'Select Model'}
              </span>
              {getStatusBadge(selectedModel?.status || 'healthy')}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
              <span className="text-amber-400 font-semibold">{selectedModel?.version}</span>
              <span className="text-slate-600">·</span>
              <span className="truncate max-w-[110px]">{selectedModel?.domain || 'General ML'}</span>
            </div>
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 text-amber-400' : ''}`} />
      </button>

      {/* Flyout Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-[440px] sm:w-[480px] max-w-[95vw] bg-[#0E131F] border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[580px] backdrop-blur-xl animate-in fade-in duration-150">
          {/* Top Search & Filter Bar */}
          <div className="p-3 border-b border-slate-800 bg-slate-900/60">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search 50+ models by name, domain, task..."
                className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none font-medium transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-white rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Domain Filter Chips */}
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
              <button
                onClick={() => setSelectedDomainFilter('All')}
                className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
                  selectedDomainFilter === 'All'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                All ({models.length})
              </button>
              {domains.map((dom) => {
                const count = models.filter((m) => (m.domain || 'General Machine Learning') === dom).length;
                const isCurrent = selectedDomainFilter === dom;
                const DomIcon = DOMAIN_ICONS[dom] || Layers;
                return (
                  <button
                    key={dom}
                    onClick={() => setSelectedDomainFilter(dom)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-all ${
                      isCurrent
                        ? 'bg-slate-800 text-amber-400 font-semibold border border-amber-500/50 shadow-xs'
                        : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <DomIcon className="w-3 h-3 shrink-0" />
                    <span>{dom}</span>
                    <span className="text-[10px] opacity-75 font-mono">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model Items Scroll Area */}
          <div ref={listRef} className="overflow-y-auto p-2 flex-1 space-y-3 custom-scrollbar divide-y divide-slate-800/60 bg-[#0E131F]">
            {Object.keys(groupedFiltered).length === 0 ? (
              <div className="py-12 px-4 text-center">
                <Search className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-slate-200">No models found</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  No model matches "{searchQuery}". Try searching for another name, domain, or version.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDomainFilter('All');
                  }}
                  className="mt-3 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700 text-xs rounded-md transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              Object.entries(groupedFiltered).map(([domain, domainModels]) => {
                const isCollapsed = collapsedDomains[domain];
                const DomIcon = DOMAIN_ICONS[domain] || Layers;

                return (
                  <div key={domain} className="pt-2.5 first:pt-0">
                    {/* Collapsible Category Header */}
                    <button
                      onClick={() => toggleDomainCollapse(domain)}
                      className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-slate-800 border border-slate-700 text-amber-400">
                          <DomIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-slate-200 group-hover:text-white transition-colors">
                          {domain}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                          {domainModels.length}
                        </span>
                      </div>
                      <ChevronRight
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                          !isCollapsed ? 'rotate-90 text-amber-400' : ''
                        }`}
                      />
                    </button>

                    {/* Model Cards in Category */}
                    {!isCollapsed && (
                      <div className="grid grid-cols-1 gap-1.5 mt-1.5 pl-1">
                        {domainModels.map((m) => {
                          const isSelected = m.id === selectedModelId;
                          const isHighlighted = flatVisibleModels[highlightedIndex]?.id === m.id;

                          return (
                            <div
                              key={m.id}
                              onClick={() => {
                                onSelectModel(m.id);
                                setIsOpen(false);
                              }}
                              className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 text-left ${
                                isSelected
                                  ? 'bg-slate-850 border-amber-400 text-white shadow-xs'
                                  : isHighlighted
                                  ? 'bg-slate-800/80 border-slate-600 text-white'
                                  : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700 text-slate-200'
                              }`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <div className="mt-1 shrink-0">{getStatusBadge(m.status)}</div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-xs text-slate-100 truncate">
                                      {m.name}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700 shrink-0">
                                      v{m.version}
                                    </span>
                                    {m.isDemo && (
                                      <span className="text-[9px] font-mono font-semibold text-amber-300 bg-amber-950/60 border border-amber-800/80 px-1 py-0.2 rounded shrink-0">
                                        DEMO DATA
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-[11px] text-slate-400 truncate mt-0.5" title={m.description}>
                                    {m.description}
                                  </p>

                                  <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-slate-400">
                                    <span className="capitalize">{m.task.replace('_', ' ')}</span>
                                    <span className="text-slate-700">·</span>
                                    <span>Reliability: <strong className={m.reliabilityScore < 70 ? 'text-rose-400' : m.reliabilityScore < 85 ? 'text-amber-400' : 'text-emerald-400'}>{m.reliabilityScore}/100</strong></span>
                                    <span className="text-slate-700">·</span>
                                    <span>{m.features?.length || 0} features</span>
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-1.5">
                                {isSelected ? (
                                  <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-400">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 hover:text-white hover:border-slate-600">
                                    Select
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer stats */}
          <div className="px-3.5 py-2 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>{models.length} Models across 10 Industry Domains</span>
            <span className="text-amber-400 font-medium">Use ↑↓ keys + Enter</span>
          </div>
        </div>
      )}
    </div>
  );
};
