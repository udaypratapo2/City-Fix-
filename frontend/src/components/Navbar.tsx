import React from 'react';
import { 
  Building2, 
  FileText, 
  Search, 
  MapPin, 
  ShieldAlert, 
  BarChart3, 
  Sparkles,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import type { StatsData } from '../types';

interface NavbarProps {
  activeTab: 'report' | 'track' | 'map' | 'admin' | 'analytics';
  setActiveTab: (tab: 'report' | 'track' | 'map' | 'admin' | 'analytics') => void;
  stats: StatsData | null;
  serverConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  stats,
  serverConnected
}) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div 
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => setActiveTab('report')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  CityFix
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI Civic
                </span>
              </div>
              <p className="text-[10px] text-slate-400 -mt-0.5 tracking-wide">
                India Civic Dispatch • Nagar Nigam OS
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/60 p-1.5 rounded-xl border border-slate-700/50">
            <button
              onClick={() => setActiveTab('report')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'report'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Report Issue
            </button>

            <button
              onClick={() => setActiveTab('track')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'track'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Track & Community
            </button>

            <button
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'map'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              City GIS Map
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'admin'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Municipal Hub
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Analytics
            </button>
          </nav>

          {/* Right quick status & stats pills */}
          <div className="flex items-center gap-3">
            {stats && (
              <div className="hidden lg:flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  {stats.resolution_rate}% Resolved
                </span>
                {stats.critical_and_high_count > 0 && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                    <AlertTriangle className="w-3 h-3" />
                    {stats.critical_and_high_count} Priority
                  </span>
                )}
              </div>
            )}

            {/* Server connection indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs">
              <span className={`w-2 h-2 rounded-full ${serverConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-slate-300 font-mono text-[11px]">
                {serverConnected ? 'API Live' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-slate-800 scrollbar-none">
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'report' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <FileText className="w-3 h-3" /> Report
          </button>
          <button
            onClick={() => setActiveTab('track')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'track' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <Search className="w-3 h-3" /> Track
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'map' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <MapPin className="w-3 h-3" /> GIS Map
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'admin' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <ShieldAlert className="w-3 h-3" /> Admin
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === 'analytics' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <BarChart3 className="w-3 h-3" /> Stats
          </button>
        </div>
      </div>
    </header>
  );
};
