import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Calendar, 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Building, 
  Save, 
  CheckCircle2, 
  AlertTriangle,
  Copy,
  Check
} from 'lucide-react';
import type { Report } from '../types';

interface IssueDetailModalProps {
  report: Report | null;
  onClose: () => void;
  onReportUpdated: (updatedReport: Report) => void;
}

const DEPARTMENTS = [
  "Road Maintenance",
  "Water Department",
  "Sanitation & Waste Management",
  "Drainage Authority",
  "Electrical Department",
  "Public Safety & Traffic",
  "Public Safety & Code Enforcement",
  "Public Works & Aesthetics",
  "City Administration"
];

export const IssueDetailModal: React.FC<IssueDetailModalProps> = ({
  report,
  onClose,
  onReportUpdated
}) => {
  if (!report) return null;

  const [status, setStatus] = useState(report.issue_status);
  const [department, setDepartment] = useState(report.municipal_department || 'City Administration');
  const [priority, setPriority] = useState(report.priority_level || 'medium');
  const [resolutionNotes, setResolutionNotes] = useState(report.resolution_notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/reports/${report.report_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue_status: status,
          municipal_department: department,
          priority_level: priority,
          resolution_notes: resolutionNotes
        })
      });

      if (res.ok) {
        const updated = await res.json();
        onReportUpdated(updated);
        onClose();
      } else {
        alert('Failed to update ticket.');
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const copyId = () => {
    navigator.clipboard.writeText(report.report_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <span className="font-mono text-lg font-black text-white">
              {report.report_id}
            </span>
            <button
              onClick={copyId}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-xs flex items-center gap-1"
              title="Copy ID"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 capitalize">
              {report.issue_type.replace(/_/g, ' ')}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Issue Description */}
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Incident Description
            </span>
            <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 text-sm text-slate-100 leading-relaxed">
              {report.issue_description}
            </div>
          </div>

          {/* Photo if present */}
          {report.photo_url && (
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Attached Photo Evidence
              </span>
              <img
                src={report.photo_url}
                alt="Report attachment"
                className="w-full h-48 object-cover rounded-xl border border-slate-700 shadow"
              />
            </div>
          )}

          {/* Location & Resident Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 text-xs space-y-1.5">
              <span className="text-slate-400 uppercase font-bold text-[10px] block mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-indigo-400" /> Location Details
              </span>
              <p className="text-white font-medium">{report.location_street_address || 'Unspecified address'}</p>
              <p className="text-slate-400">{report.location_city || 'City'}, {report.location_state || 'CA'}</p>
              <p className="font-mono text-slate-500 text-[11px]">
                Lat: {report.latitude?.toFixed(4)}, Lng: {report.longitude?.toFixed(4)}
              </p>
            </div>

            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 text-xs space-y-1.5">
              <span className="text-slate-400 uppercase font-bold text-[10px] block mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-indigo-400" /> Resident Submitter
              </span>
              {report.is_anonymous ? (
                <p className="text-slate-400 italic">Reported anonymously</p>
              ) : (
                <>
                  <p className="text-white font-medium">{report.resident_name || 'Resident'}</p>
                  {report.resident_email && <p className="text-slate-300">{report.resident_email}</p>}
                  {report.resident_phone && <p className="text-slate-400">{report.resident_phone}</p>}
                </>
              )}
            </div>
          </div>

          {/* Dispatch Management Form */}
          <div className="p-4 bg-slate-800/90 rounded-2xl border border-slate-700 space-y-4">
            <span className="text-xs font-bold text-white uppercase tracking-wider block flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" /> Municipal Triage Controls
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Lifecycle Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="submitted">Submitted</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:ring-1 focus:ring-indigo-500"
                >
                  {DEPARTMENTS.map((d, i) => (
                    <option key={i} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Priority Tier</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:ring-1 focus:ring-indigo-500 capitalize"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Resolution Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Resolution & Field Crew Notes
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={3}
                placeholder="E.g., Field crew unit #4 dispatched to patch asphalt. Completed at 14:30."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-end gap-3 sticky bottom-0 z-10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
