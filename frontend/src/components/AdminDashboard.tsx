import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  Edit3, 
  Building2, 
  ExternalLink, 
  RefreshCw,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import type { Report } from '../types';

interface AdminDashboardProps {
  onSelectReport: (report: Report) => void;
  onRefreshNeeded: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onSelectReport,
  onRefreshNeeded
}) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [department, setDepartment] = useState('all');
  const [departments, setDepartments] = useState<string[]>([]);

  // Sorting
  const [sortBy, setSortBy] = useState('report_datetime');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  // Updating in-line status indicator
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, [page, status, priority, department, sortBy, sortDir]);

  // Load department options once
  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const res = await fetch('/api/metadata');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        status,
        priority,
        department,
        sort_by: sortBy,
        sort_dir: sortDir,
        search
      });

      const res = await fetch(`/api/reports?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        setTotalPages(data.total_pages || 1);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching admin reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReports();
  };

  const handleQuickStatusChange = async (reportId: string, newStatus: 'submitted' | 'in-progress' | 'resolved') => {
    setUpdatingId(reportId);
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue_status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setReports(prev => prev.map(r => r.report_id === reportId ? updated : r));
        onRefreshNeeded();
      }
    } catch (err) {
      console.error('Failed to update report status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-indigo-400" />
            Municipal Operations & Dispatch Board
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage, triage, and reassign citizen reports across city departments in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setPage(1);
              fetchReports();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 shadow-xl space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ticket ID, resident name, street, or keywords..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow transition"
          >
            Search
          </button>
        </form>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          {/* Status */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-slate-400 text-[11px]">Status:</span>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All</option>
              <option value="submitted" className="bg-slate-900">Submitted</option>
              <option value="in-progress" className="bg-slate-900">In Progress</option>
              <option value="resolved" className="bg-slate-900">Resolved</option>
            </select>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-slate-400 text-[11px]">Priority:</span>
            <select
              value={priority}
              onChange={(e) => { setPriority(e.target.value); setPage(1); }}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All</option>
              <option value="critical" className="bg-slate-900 text-rose-400">Critical</option>
              <option value="high" className="bg-slate-900 text-orange-400">High</option>
              <option value="medium" className="bg-slate-900 text-amber-400">Medium</option>
              <option value="low" className="bg-slate-900 text-slate-400">Low</option>
            </select>
          </div>

          {/* Department */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="text-slate-400 text-[11px]">Dept:</span>
            <select
              value={department}
              onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="all" className="bg-slate-900">All Departments</option>
              {departments.map((d, idx) => (
                <option key={idx} value={d} className="bg-slate-900">{d}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700 ml-auto">
            <span className="text-slate-400 text-[11px]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="report_datetime" className="bg-slate-900">Date Logged</option>
              <option value="priority_score" className="bg-slate-900">Priority Score</option>
              <option value="citizen_reports_count" className="bg-slate-900">Upvotes Count</option>
            </select>
            <button
              onClick={() => setSortDir(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="text-slate-400 hover:text-white ml-1"
              title="Toggle sort direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Reports Data Table */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Category & Details</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status Dispatch</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      Loading reports...
                    </div>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No reports match the selected filters.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr
                    key={report.report_id}
                    className="hover:bg-slate-700/40 transition-colors group"
                  >
                    {/* Ticket ID & Date */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-white group-hover:text-indigo-400 transition-colors">
                        {report.report_id}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(report.report_datetime).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Category & Description preview */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900 text-indigo-300 capitalize mb-1">
                        {report.issue_type?.replace(/_/g, ' ')}
                      </span>
                      <p className="text-slate-300 line-clamp-2 text-xs">
                        {report.issue_description}
                      </p>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-200">
                      {report.municipal_department || 'Unassigned'}
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 text-slate-400 max-w-[150px] truncate">
                      <div className="text-slate-300 font-medium truncate">
                        {report.location_street_address || 'City Zone'}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {report.location_city || 'City'}
                      </div>
                    </td>

                    {/* Priority */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        report.priority_level === 'critical' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                        report.priority_level === 'high' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                        report.priority_level === 'medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-slate-700 text-slate-300'
                      }`}>
                        {report.priority_level}
                      </span>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Score: {report.priority_score}
                      </div>
                    </td>

                    {/* Quick Status Select */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <select
                        value={report.issue_status}
                        onChange={(e) => handleQuickStatusChange(report.report_id, e.target.value as any)}
                        disabled={updatingId === report.report_id}
                        className={`text-xs font-semibold py-1 px-2.5 rounded-lg border focus:outline-none cursor-pointer transition ${
                          report.issue_status === 'resolved'
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                            : report.issue_status === 'in-progress'
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-slate-900 border-slate-700 text-indigo-300'
                        }`}
                      >
                        <option value="submitted" className="bg-slate-900 text-white">Submitted</option>
                        <option value="in-progress" className="bg-slate-900 text-white">In Progress</option>
                        <option value="resolved" className="bg-slate-900 text-white">Resolved</option>
                      </select>
                    </td>

                    {/* Action button */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => onSelectReport(report)}
                        className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-indigo-600 text-slate-300 hover:text-white transition"
                        title="View & Edit Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-900/80 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{reports.length}</strong> of{' '}
            <strong className="text-white">{totalCount}</strong> reports
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-white px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
