import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Layers, 
  ShieldAlert,
  Building2
} from 'lucide-react';
import type { StatsData } from '../types';

interface AnalyticsViewProps {
  stats: StatsData | null;
  loading: boolean;
  onRefresh: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  stats,
  loading,
  onRefresh
}) => {
  if (!stats) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 text-center text-slate-400">
        <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block mb-2" />
        <p className="text-sm">Loading municipal analytics...</p>
      </div>
    );
  }

  const categoryEntries = Object.entries(stats.by_category || {}).sort((a, b) => b[1] - a[1]);
  const deptEntries = Object.entries(stats.by_department || {}).sort((a, b) => b[1] - a[1]);
  const maxCategoryCount = categoryEntries.length > 0 ? categoryEntries[0][1] : 1;
  const maxDeptCount = deptEntries.length > 0 ? deptEntries[0][1] : 1;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            City Performance & Civic Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Operational metrics, department workloads, and resolution effectiveness.
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition self-start sm:self-auto"
        >
          {loading ? 'Refreshing...' : 'Refresh Metrics'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Reports Logged</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {stats.total_reports}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Across all municipal districts
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Resolution Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {stats.resolution_rate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {stats.by_status.resolved} issues solved
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Critical & High Urgency</span>
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-extrabold text-orange-400 font-mono">
            {stats.critical_and_high_count}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Safety & hazard concerns
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Avg Priority Score</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-400 font-mono">
            {stats.avg_priority_score} <span className="text-xs text-slate-400 font-normal">/ 10</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            AI risk & impact evaluation
          </div>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Complaints by Issue Category</span>
            <span className="text-xs text-slate-400 font-normal">Volume</span>
          </h2>
          <div className="space-y-3">
            {categoryEntries.map(([cat, count]) => {
              const pct = Math.round((count / maxCategoryCount) * 100);
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-200 capitalize">
                      {cat.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {count} ({Math.round((count / stats.total_reports) * 100)}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department Workload */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>Department Assignment Distribution</span>
            <span className="text-xs text-slate-400 font-normal">Caseload</span>
          </h2>
          <div className="space-y-3">
            {deptEntries.map(([dept, count]) => {
              const pct = Math.round((count / maxDeptCount) * 100);
              return (
                <div key={dept}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-200 truncate max-w-[200px]">
                      {dept}
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {count} reports
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            Incident Resolution Lifecycle
          </h2>
          <div className="grid grid-cols-3 gap-3 text-center mb-4">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700">
              <span className="text-[11px] text-slate-400 block mb-1">Submitted</span>
              <span className="text-lg font-bold text-indigo-400 font-mono">
                {stats.by_status.submitted}
              </span>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700">
              <span className="text-[11px] text-slate-400 block mb-1">In Progress</span>
              <span className="text-lg font-bold text-amber-400 font-mono">
                {stats.by_status['in-progress']}
              </span>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700">
              <span className="text-[11px] text-slate-400 block mb-1">Resolved</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">
                {stats.by_status.resolved}
              </span>
            </div>
          </div>

          <div className="w-full bg-slate-900 h-3 rounded-full flex overflow-hidden">
            <div
              className="bg-indigo-500 h-full"
              style={{ width: `${(stats.by_status.submitted / stats.total_reports) * 100}%` }}
              title={`Submitted: ${stats.by_status.submitted}`}
            />
            <div
              className="bg-amber-400 h-full"
              style={{ width: `${(stats.by_status['in-progress'] / stats.total_reports) * 100}%` }}
              title={`In Progress: ${stats.by_status['in-progress']}`}
            />
            <div
              className="bg-emerald-500 h-full"
              style={{ width: `${(stats.by_status.resolved / stats.total_reports) * 100}%` }}
              title={`Resolved: ${stats.by_status.resolved}`}
            />
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            Priority Tier Allocation
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <span className="text-[10px] text-rose-400 uppercase font-bold block mb-1">Critical</span>
              <span className="text-lg font-bold text-white font-mono">{stats.by_priority.critical || 0}</span>
            </div>
            <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
              <span className="text-[10px] text-orange-400 uppercase font-bold block mb-1">High</span>
              <span className="text-lg font-bold text-white font-mono">{stats.by_priority.high || 0}</span>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <span className="text-[10px] text-amber-400 uppercase font-bold block mb-1">Medium</span>
              <span className="text-lg font-bold text-white font-mono">{stats.by_priority.medium || 0}</span>
            </div>
            <div className="p-3 bg-slate-700/30 border border-slate-700 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Low</span>
              <span className="text-lg font-bold text-white font-mono">{stats.by_priority.low || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
