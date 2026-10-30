import React from 'react';
import {
  LayoutDashboard,
  Split,
  Activity,
  AlertTriangle,
  GitCompare,
  Sliders,
  Bot,
  Database,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Radar,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export type NavTab =
  | 'overview'
  | 'reliability-radar'
  | 'live'
  | 'subgroups'
  | 'drift'
  | 'incidents'
  | 'models'
  | 'regression'
  | 'assistant'
  | 'simulator'
  | 'integrations';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  openIncidentsCount: number;
  silentFailuresCount: number;
  modelName?: string;
  onTriggerStressShift?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  openIncidentsCount,
  silentFailuresCount,
}) => {
  const navItems = [
    {
      id: 'overview' as NavTab,
      label: 'Overview Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'reliability-radar' as NavTab,
      label: 'AI Reliability Radar',
      icon: Radar,
      badge: '4-Axis',
      badgeColor: 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/25',
    },
    {
      id: 'live' as NavTab,
      label: 'Live Monitor',
      icon: Activity,
      badge: 'Live',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
    },
    {
      id: 'subgroups' as NavTab,
      label: 'Hidden Failure Radar',
      icon: Split,
      badge: silentFailuresCount > 0 ? `${silentFailuresCount} Critical` : null,
      badgeColor: 'text-rose-400 bg-rose-500/10 border border-rose-500/20',
    },
    {
      id: 'drift' as NavTab,
      label: 'Drift Detection',
      icon: Activity,
      badge: null,
    },
    {
      id: 'incidents' as NavTab,
      label: 'Incident Center',
      icon: AlertTriangle,
      badge: openIncidentsCount > 0 ? `${openIncidentsCount}` : null,
      badgeColor: 'text-amber-400 bg-amber-500/10 border border-amber-500/20',
    },
    {
      id: 'models' as NavTab,
      label: 'Model Registry',
      icon: Layers,
      badge: null,
    },
    {
      id: 'regression' as NavTab,
      label: 'Model Comparison',
      icon: GitCompare,
      badge: null,
    },
    {
      id: 'assistant' as NavTab,
      label: 'Investigation Assistant',
      icon: Bot,
      badge: 'AI',
      badgeColor: 'text-purple-400 bg-purple-500/10 border border-purple-500/20',
    },
    {
      id: 'simulator' as NavTab,
      label: 'What-If Simulator',
      icon: Sliders,
      badge: null,
    },
    {
      id: 'integrations' as NavTab,
      label: 'Data Sources & Audits',
      icon: Database,
      badge: null,
    },
  ];

  const { theme } = useTheme();

  return (
    <aside
      className={`sidebar border-r flex flex-col justify-between transition-all duration-200 shrink-0 select-none ${
        theme === 'dark' ? 'border-slate-800 bg-[#0B0F17]' : 'border-slate-200 bg-white'
      } ${collapsed ? 'w-16 collapsed' : 'w-[230px]'}`}
      style={{
        width: collapsed ? 64 : 230,
      }}
    >
      {/* Top Nav Items */}
      <nav className="py-3 px-2 flex flex-col gap-1 shrink-0 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all w-full text-left relative group active:scale-[0.99] ${
                isActive
                  ? item.id === 'reliability-radar'
                    ? theme === 'dark'
                      ? 'bg-violet-950/35 text-cyan-200 font-semibold shadow-xs border border-violet-500/30'
                      : 'bg-violet-50 text-violet-950 font-semibold shadow-xs border border-violet-200'
                    : theme === 'dark'
                    ? 'bg-slate-800 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 text-slate-900 font-semibold shadow-xs'
                  : theme === 'dark'
                  ? item.id === 'reliability-radar'
                    ? 'text-slate-400 hover:text-cyan-200 hover:bg-violet-950/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <div
                  className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full shadow-xs ${
                    item.id === 'reliability-radar'
                      ? 'bg-cyan-400 shadow-cyan-400/50'
                      : 'bg-amber-400'
                  }`}
                />
              )}
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-105 ${
                  isActive
                    ? item.id === 'reliability-radar'
                      ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                      : 'text-amber-400'
                    : theme === 'dark'
                    ? 'text-slate-400 group-hover:text-slate-200'
                    : 'text-slate-500 group-hover:text-slate-700'
                }`}
              />
              {!collapsed && (
                <div className="flex items-center justify-between w-full min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-semibold shrink-0 ${
                        item.badgeColor || 'text-slate-400 bg-slate-800'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom status & collapse toggle anchored to bottom via mt-auto */}
      <div
        className={`mt-auto p-2.5 border-t shrink-0 flex flex-col gap-2 ${
          theme === 'dark' ? 'border-slate-800 bg-[#0B0F17]' : 'border-slate-200 bg-white'
        }`}
      >
        {!collapsed ? (
          <div
            className={`p-2.5 rounded-lg border text-xs flex flex-col gap-1.5 transition-colors ${
              theme === 'dark'
                ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-semibold text-[11px] tracking-tight text-slate-200">Sentinel Engine</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                ACTIVE
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
              <span className="truncate">Continuous SLA</span>
              <span className="font-mono text-emerald-400 font-medium">99.9% Nominal</span>
            </div>
          </div>
        ) : (
          <div
            className="flex items-center justify-center py-2"
            title="Sentinel Engine: ACTIVE (99.9% Nominal)"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className={`flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg transition-colors text-xs font-medium w-full ${
            theme === 'dark'
              ? 'hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
              : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
          }`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-[11px]">Collapse sidebar</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
