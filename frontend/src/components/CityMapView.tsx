import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  Filter, 
  MapPin, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ShieldAlert,
  Sparkles,
  Search
} from 'lucide-react';
import type { Report, AppConfig } from '../types';

interface CityMapViewProps {
  onSelectReport: (report: Report) => void;
}

export const CityMapView: React.FC<CityMapViewProps> = ({ onSelectReport }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [departments, setDepartments] = useState<string[]>([]);

  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((cfg) => cfg && setAppConfig(cfg))
      .catch(() => undefined);
    fetchMapReports();
  }, []);

  const fetchMapReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports?limit=all');
      if (res.ok) {
        const data = await res.json();
        const repList: Report[] = data.reports || [];
        setReports(repList);

        // Extract unique departments
        const depts = Array.from(new Set(repList.map(r => r.municipal_department).filter(Boolean))) as string[];
        setDepartments(depts.sort());
      }
    } catch (err) {
      console.error('Error loading reports for map:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) {
      if (appConfig) {
        mapInstanceRef.current.setView([appConfig.map.lat, appConfig.map.lng], appConfig.map.zoom);
      }
      return;
    }

    const lat = appConfig?.map.lat ?? 28.6139;
    const lng = appConfig?.map.lng ?? 77.2090;
    const zoom = appConfig?.map.zoom ?? 12;
    const map = L.map(mapContainerRef.current).setView([lat, lng], zoom);
    mapInstanceRef.current = map;

    L.tileLayer(appConfig?.map.tile_url || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: appConfig?.map.attribution || '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [appConfig]);

  // Update map markers whenever reports or filters change
  useEffect(() => {
    if (!markersLayerRef.current || !mapInstanceRef.current) return;
    
    markersLayerRef.current.clearLayers();

    const filtered = reports.filter(r => {
      if (statusFilter !== 'all' && (r.issue_status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (priorityFilter !== 'all' && (r.priority_level || '').toLowerCase() !== priorityFilter.toLowerCase()) return false;
      if (departmentFilter !== 'all' && (r.municipal_department || '').toLowerCase() !== departmentFilter.toLowerCase()) return false;
      return true;
    });

    const validCoordinates: [number, number][] = [];

    filtered.forEach(report => {
      if (!report.latitude || !report.longitude) return;
      
      const lat = Number(report.latitude);
      const lng = Number(report.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      validCoordinates.push([lat, lng]);

      // Color coding based on status & priority
      let color = '#6366f1'; // default indigo
      if (report.issue_status === 'resolved') {
        color = '#10b981'; // emerald
      } else if (report.priority_level === 'critical') {
        color = '#f43f5e'; // rose
      } else if (report.priority_level === 'high') {
        color = '#f97316'; // orange
      } else if (report.priority_level === 'medium') {
        color = '#f59e0b'; // amber
      }

      const marker = L.circleMarker([lat, lng], {
        radius: report.priority_level === 'critical' ? 9 : 7,
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.85
      });

      // Custom popup HTML
      const popupContent = document.createElement('div');
      popupContent.className = 'p-1 text-slate-100 min-w-[200px]';
      popupContent.innerHTML = `
        <div class="flex items-center justify-between gap-2 mb-1.5">
          <span class="font-mono text-xs font-bold text-indigo-400">${report.report_id}</span>
          <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
            ${report.issue_status}
          </span>
        </div>
        <div class="font-semibold text-xs text-white capitalize mb-1">
          ${report.issue_type?.replace(/_/g, ' ')}
        </div>
        <p class="text-[11px] text-slate-300 line-clamp-2 mb-2">
          ${report.issue_description}
        </p>
        <div class="text-[10px] text-slate-400 mb-2">
          📍 ${report.location_street_address || 'City Zone'}
        </div>
        <button id="btn-${report.report_id}" class="w-full py-1 px-2 text-[11px] font-semibold rounded bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer">
          Inspect Issue
        </button>
      `;

      popupContent.querySelector(`#btn-${report.report_id}`)?.addEventListener('click', () => {
        onSelectReport(report);
      });

      marker.bindPopup(popupContent);
      marker.addTo(markersLayerRef.current);
    });

    // Fit bounds if we have points
    if (validCoordinates.length > 0 && mapInstanceRef.current) {
      try {
        const bounds = L.latLngBounds(validCoordinates);
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      } catch (e) {
        // Safe fallback
      }
    }
  }, [reports, statusFilter, priorityFilter, departmentFilter]);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-4">
      {/* Header & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/80 p-4 rounded-2xl border border-slate-700 shadow-xl">
        <div>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-400" />
            India GIS Incident Map
          </h1>
          <p className="text-xs text-slate-400">
            Live civic tickets across Indian cities — OSM tiles, India geocoding, PWD / Jal Board / Nagar Nigam routing.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-700">
            <span className="text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All</option>
              <option value="submitted" className="bg-slate-900">Submitted</option>
              <option value="in-progress" className="bg-slate-900">In Progress</option>
              <option value="resolved" className="bg-slate-900">Resolved</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-700">
            <span className="text-slate-400">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All</option>
              <option value="critical" className="bg-slate-900 text-rose-400">Critical</option>
              <option value="high" className="bg-slate-900 text-orange-400">High</option>
              <option value="medium" className="bg-slate-900 text-amber-400">Medium</option>
              <option value="low" className="bg-slate-900 text-slate-400">Low</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-700">
            <span className="text-slate-400">Dept:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer max-w-[140px] truncate"
            >
              <option value="all" className="bg-slate-900">All Departments</option>
              {departments.map((d, i) => (
                <option key={i} value={d} className="bg-slate-900">{d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Map Card */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl relative h-[650px]">
        {loading && (
          <div className="absolute inset-0 z-30 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-indigo-400 font-medium">
              <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              Loading GIS reports data...
            </div>
          </div>
        )}

        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Legend */}
        <div className="absolute bottom-4 right-4 z-20 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1.5 pointer-events-auto">
          <div className="font-bold text-slate-200 text-[11px] uppercase tracking-wider mb-1">
            Map Legend
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Critical / High Priority
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Medium Priority
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Submitted (Unresolved)
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Resolved by Field Crew
          </div>
        </div>
      </div>
    </div>
  );
};
