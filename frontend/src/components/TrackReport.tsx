import React, { useState, useEffect } from 'react';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  MapPin, 
  ThumbsUp, 
  AlertTriangle, 
  FileText, 
  Check, 
  Building, 
  Calendar,
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import type { Report } from '../types';

interface TrackReportProps {
  initialReportId?: string;
  onSelectReportModal: (report: Report) => void;
}

export const TrackReport: React.FC<TrackReportProps> = ({
  initialReportId,
  onSelectReportModal
}) => {
  const [searchId, setSearchId] = useState(initialReportId || '');
  const [trackedReport, setTrackedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  
  // Community Feed
  const [communityReports, setCommunityReports] = useState<Report[]>([]);
  const [feedFilter, setFeedFilter] = useState<'all' | 'submitted' | 'in-progress' | 'resolved'>('all');
  const [feedSearch, setFeedSearch] = useState('');
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());

  // If initialReportId provided, fetch immediately
  useEffect(() => {
    if (initialReportId) {
      setSearchId(initialReportId);
      lookupReport(initialReportId);
    }
  }, [initialReportId]);

  // Load community feed
  useEffect(() => {
    fetchCommunityFeed();
  }, [feedFilter]);

  const fetchCommunityFeed = async () => {
    try {
      let url = `/api/reports?limit=12&sort_by=report_datetime&sort_dir=desc`;
      if (feedFilter !== 'all') {
        url += `&status=${feedFilter}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCommunityReports(data.reports || []);
      }
    } catch (err) {
      console.error('Error fetching community feed:', err);
    }
  };

  const lookupReport = async (idToLookUp: string) => {
    const clean = idToLookUp.trim();
    if (!clean) return;

    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(clean)}`);
      if (res.ok) {
        const data: Report = await res.json();
        setTrackedReport(data);
      } else {
        // Fallback: search across all reports if citizen entered phone or address
        const searchRes = await fetch(`/api/reports?search=${encodeURIComponent(clean)}&limit=1`);
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.reports && searchData.reports.length > 0) {
            setTrackedReport(searchData.reports[0]);
          } else {
            setTrackedReport(null);
            setNotFound(true);
          }
        } else {
          setTrackedReport(null);
          setNotFound(true);
        }
      }
    } catch (err) {
      console.error('Error searching report:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (reportId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (upvotedIds.has(reportId)) return;

    try {
      const res = await fetch(`/api/reports/${reportId}/upvote`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setUpvotedIds(prev => new Set(prev).add(reportId));
        
        // Update state in tracked report if it's currently viewed
        if (trackedReport && trackedReport.report_id === reportId) {
          setTrackedReport({
            ...trackedReport,
            citizen_reports_count: data.citizen_reports_count,
            priority_score: data.priority_score
          });
        }

        // Update state in community feed
        setCommunityReports(prev =>
          prev.map(r =>
            r.report_id === reportId
              ? { ...r, citizen_reports_count: data.citizen_reports_count, priority_score: data.priority_score }
              : r
          )
        );
      }
    } catch (err) {
      console.error('Failed to upvote:', err);
    }
  };

  // Timeline step calculation
  const getStepStatus = (stepIndex: number, currentStatus?: string) => {
    const statusOrder = ['submitted', 'in-progress', 'resolved'];
    const currentIndex = statusOrder.indexOf(currentStatus || 'submitted');
    if (currentIndex >= stepIndex) return 'completed';
    if (currentIndex === stepIndex - 1) return 'current';
    return 'pending';
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-8">
      {/* Header & Search */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
          Track Your Municipal Ticket
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter your report ID (e.g. <span className="font-mono text-indigo-400">RPT-354769</span>) or explore community reports submitted by neighbors in your area.
        </p>

        {/* Search Bar */}
        <div className="mt-6 flex items-center gap-2 max-w-lg mx-auto bg-slate-800/80 p-1.5 rounded-2xl border border-slate-700 shadow-xl">
          <div className="pl-3 text-slate-400">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lookupReport(searchId)}
            placeholder="Enter Report ID (e.g., RPT-354769)..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none px-2"
          />
          <button
            onClick={() => lookupReport(searchId)}
            disabled={loading || !searchId.trim()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Looking up...' : 'Track'}
          </button>
        </div>

        {notFound && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-center gap-2 max-w-md mx-auto">
            <AlertTriangle className="w-4 h-4" />
            <span>No report found with ID or query "{searchId}". Try browsing the feed below.</span>
          </div>
        )}
      </div>

      {/* Active Tracked Ticket Details */}
      {trackedReport && (
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-2xl animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-700">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xl font-mono font-black text-white">
                  {trackedReport.report_id}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  trackedReport.issue_status === 'resolved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                  trackedReport.issue_status === 'in-progress' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}>
                  {trackedReport.issue_status.replace('-', ' ')}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700 text-slate-300 capitalize">
                  {trackedReport.issue_type.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Submitted on {new Date(trackedReport.report_datetime).toLocaleString()}
              </p>
            </div>

            {/* Upvote Button */}
            <button
              onClick={() => handleUpvote(trackedReport.report_id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition shadow-sm ${
                upvotedIds.has(trackedReport.report_id)
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                  : 'bg-slate-700/60 border-slate-600 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${upvotedIds.has(trackedReport.report_id) ? 'fill-emerald-400 text-emerald-400' : ''}`} />
              <span>{upvotedIds.has(trackedReport.report_id) ? 'Upvoted' : 'I noticed this too'}</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-800 text-[11px] font-mono text-white">
                {trackedReport.citizen_reports_count || 1}
              </span>
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="py-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2 shadow ${
                  getStepStatus(0, trackedReport.issue_status) === 'completed'
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20'
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  <Check className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-white">1. Submitted</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Ticket logged by citizen</span>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2 shadow ${
                  getStepStatus(1, trackedReport.issue_status) === 'completed'
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20'
                    : 'bg-indigo-600 text-white ring-4 ring-indigo-500/20'
                }`}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-white">2. AI Triaged</span>
                <span className="text-[11px] text-slate-400 mt-0.5">{trackedReport.municipal_department}</span>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2 shadow ${
                  getStepStatus(1, trackedReport.issue_status) === 'completed'
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20'
                    : trackedReport.issue_status === 'in-progress'
                    ? 'bg-amber-500 text-slate-900 ring-4 ring-amber-500/20 animate-pulse'
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-white">3. Field Crew</span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  {trackedReport.issue_status === 'in-progress' ? 'Crew on site' : 'Pending dispatch'}
                </span>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center text-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2 shadow ${
                  trackedReport.issue_status === 'resolved'
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20'
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-white">4. Resolved</span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  {trackedReport.issue_status === 'resolved' ? 'Work completed' : 'Awaiting signoff'}
                </span>
              </div>
            </div>
          </div>

          {/* Ticket Information Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-700">
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Report Description
              </h4>
              <p className="text-sm text-slate-200 bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/60">
                "{trackedReport.issue_description}"
              </p>

              {trackedReport.resolution_notes && (
                <div className="mt-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <span className="text-xs font-bold text-emerald-400 block mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Municipal Resolution Notes
                  </span>
                  <p className="text-xs text-slate-300">{trackedReport.resolution_notes}</p>
                  {trackedReport.resolution_datetime && (
                    <span className="text-[10px] text-emerald-400/80 block mt-1">
                      Completed: {new Date(trackedReport.resolution_datetime).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Location & Dispatch Details
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-700">
                  <span className="text-slate-400 block text-[11px]">Location</span>
                  <span className="text-white font-medium truncate block">
                    {trackedReport.location_street_address || 'Central Zone'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {trackedReport.latitude?.toFixed(4)}, {trackedReport.longitude?.toFixed(4)}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-700">
                  <span className="text-slate-400 block text-[11px]">Assigned Department</span>
                  <span className="text-indigo-400 font-medium truncate block">
                    {trackedReport.municipal_department}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-700">
                  <span className="text-slate-400 block text-[11px]">Priority Level</span>
                  <span className={`font-semibold capitalize ${
                    trackedReport.priority_level === 'critical' ? 'text-rose-400' :
                    trackedReport.priority_level === 'high' ? 'text-orange-400' :
                    trackedReport.priority_level === 'medium' ? 'text-amber-400' : 'text-slate-300'
                  }`}>
                    {trackedReport.priority_level} (Score: {trackedReport.priority_score})
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-700">
                  <span className="text-slate-400 block text-[11px]">Citizen Submitter</span>
                  <span className="text-slate-200 truncate block">
                    {trackedReport.is_anonymous ? 'Anonymous' : trackedReport.resident_name}
                  </span>
                </div>
              </div>

              {trackedReport.photo_url && (
                <div className="mt-2">
                  <span className="text-[11px] text-slate-400 block mb-1">Attached Photo:</span>
                  <img
                    src={trackedReport.photo_url}
                    alt="Report visual"
                    className="w-full h-32 object-cover rounded-xl border border-slate-700"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Community Reports Feed */}
      <div className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-400" />
              Community Civic Feed
            </h2>
            <p className="text-xs text-slate-400">
              Browse recent issues reported across the city. Upvote issues that also affect you to help city staff prioritize repairs.
            </p>
          </div>

          {/* Feed Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
            {(['all', 'submitted', 'in-progress', 'resolved'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFeedFilter(filter)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                  feedFilter === filter
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {filter.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Community Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {communityReports.map((report) => (
            <div
              key={report.report_id}
              onClick={() => onSelectReportModal(report)}
              className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 hover:border-indigo-500/50 rounded-2xl p-4 transition-all duration-200 shadow-md hover:shadow-xl cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-indigo-400">
                    {report.report_id}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    report.issue_status === 'resolved' ? 'bg-emerald-500/20 text-emerald-300' :
                    report.issue_status === 'in-progress' ? 'bg-amber-500/20 text-amber-300' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {report.issue_status.replace('-', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold mb-1 capitalize">
                  <span>{report.issue_type.replace(/_/g, ' ')}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400 text-[11px] font-normal truncate">
                    {report.municipal_department}
                  </span>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 mb-3">
                  {report.issue_description}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 border-t border-slate-700/60">
                  <span className="flex items-center gap-1 truncate max-w-[160px]">
                    <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                    {report.location_street_address || 'City Zone'}
                  </span>

                  <button
                    onClick={(e) => handleUpvote(report.report_id, e)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition ${
                      upvotedIds.has(report.report_id)
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <ThumbsUp className={`w-3 h-3 ${upvotedIds.has(report.report_id) ? 'fill-emerald-400 text-emerald-400' : ''}`} />
                    <span>{report.citizen_reports_count || 1}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
