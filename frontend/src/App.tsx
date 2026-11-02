import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CitizenReportForm } from './components/CitizenReportForm';
import { TrackReport } from './components/TrackReport';
import { CityMapView } from './components/CityMapView';
import { AdminDashboard } from './components/AdminDashboard';
import { AnalyticsView } from './components/AnalyticsView';
import { IssueDetailModal } from './components/IssueDetailModal';
import type { Report, StatsData } from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<'report' | 'track' | 'map' | 'admin' | 'analytics'>('report');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [serverConnected, setServerConnected] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  // Selected report for detailed modal
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  
  // Track report specific ID
  const [trackReportId, setTrackReportId] = useState<string>('');

  useEffect(() => {
    fetchStats();
    checkHealth();

    // Periodic stats refresh
    const interval = setInterval(() => {
      fetchStats();
      checkHealth();
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      setServerConnected(res.ok);
    } catch {
      setServerConnected(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data: StatsData = await res.json();
        setStats(data);
        setServerConnected(true);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setServerConnected(false);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleReportCreated = (newReport: Report) => {
    fetchStats();
  };

  const handleNavigateToTrack = (reportId: string) => {
    setTrackReportId(reportId);
    setActiveTab('track');
  };

  const handleReportUpdated = (updatedReport: Report) => {
    fetchStats();
    setSelectedReport(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        serverConnected={serverConnected}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'report' && (
          <CitizenReportForm
            onReportCreated={handleReportCreated}
            onNavigateToTrack={handleNavigateToTrack}
          />
        )}

        {activeTab === 'track' && (
          <TrackReport
            initialReportId={trackReportId}
            onSelectReportModal={(report) => setSelectedReport(report)}
          />
        )}

        {activeTab === 'map' && (
          <CityMapView
            onSelectReport={(report) => setSelectedReport(report)}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboard
            onSelectReport={(report) => setSelectedReport(report)}
            onRefreshNeeded={fetchStats}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            stats={stats}
            loading={statsLoading}
            onRefresh={fetchStats}
          />
        )}
      </main>

      {/* Detail Inspection / Edit Modal */}
      {selectedReport && (
        <IssueDetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onReportUpdated={handleReportUpdated}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>CityFix India Municipal Operating System &copy; {new Date().getFullYear()}</span>
          <span className="font-mono text-[11px] text-slate-400">
            ML triage for Indian cities &bull; OSM / Nominatim maps (optional Google key)
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
