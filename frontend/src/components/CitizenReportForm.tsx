import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  MapPin, 
  Camera, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck, 
  User, 
  Mail, 
  Phone, 
  Info,
  Layers,
  ArrowRight,
  Copy,
  Check
} from 'lucide-react';
import L from 'leaflet';
import type { PredictionResult, Report, AppConfig, MapCity } from '../types';

interface CitizenReportFormProps {
  onReportCreated: (report: Report) => void;
  onNavigateToTrack: (reportId: string) => void;
}

const SAMPLE_PROMPTS = [
  {
    label: "🚧 Gaddha / Pothole",
    text: "Bada gaddha on MG Road near the metro station, two-wheelers are falling and cars are swerving into oncoming traffic."
  },
  {
    label: "💧 Pipeline Burst",
    text: "URGENT: Jal board pipeline burst in front of the government school, flooding the entire gali and wasting drinking water."
  },
  {
    label: "🕳️ Open Manhole",
    text: "Open manhole without cover near the bus stand after monsoon rain, children and two-wheelers are at serious risk."
  },
  {
    label: "🗑️ Kachra Overflow",
    text: "Kooda nahi uthaya 3 din se, municipal bins overflowing onto the footpath attracting stray dogs and flies."
  },
  {
    label: "🐕 Stray Cattle",
    text: "Stray cattle sitting on the highway service lane near the flyover, causing accident risk during peak hours."
  }
];

const SAMPLE_PHOTOS = [
  { label: "Pothole", url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80" },
  { label: "Water Leak", url: "https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&auto=format&fit=crop&q=80" },
  { label: "Garbage", url: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600&auto=format&fit=crop&q=80" },
  { label: "Streetlight", url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80" }
];

export const CitizenReportForm: React.FC<CitizenReportFormProps> = ({
  onReportCreated,
  onNavigateToTrack
}) => {
  const [description, setDescription] = useState('');
  const [isPredicting, setIsPredicting] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  
  // Form fields
  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [address, setAddress] = useState('Connaught Place');
  const [city, setCity] = useState('New Delhi');
  const [stateName, setStateName] = useState('Delhi');
  const [pinCode, setPinCode] = useState('110001');
  const [lat, setLat] = useState(28.6139);
  const [lng, setLng] = useState(77.2090);
  const [photoUrl, setPhotoUrl] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<Array<{ display_name: string; latitude: number; longitude: number; street?: string; city?: string; state?: string; pin?: string }>>([]);
  const [searchingPlace, setSearchingPlace] = useState(false);
  const [cities, setCities] = useState<MapCity[]>([]);
  const [tileUrl, setTileUrl] = useState('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
  const [configReady, setConfigReady] = useState(false);
  
  // Citizen contact
  const [residentName, setResidentName] = useState('Priya Sharma');
  const [residentEmail, setResidentEmail] = useState('priya.sharma@gmail.com');
  const [residentPhone, setResidentPhone] = useState('+91 98765 43210');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Status & Submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<Report | null>(null);
  const [copied, setCopied] = useState(false);

  // Map reference
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Load India map config (tiles + default city) before initializing Leaflet
  useEffect(() => {
    fetch('/api/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((cfg: AppConfig | null) => {
        if (!cfg) {
          setConfigReady(true);
          return;
        }
        setTileUrl(cfg.map.tile_url);
        setCities(cfg.cities || []);
        setCity(cfg.default_city);
        setStateName(cfg.default_state);
        setPinCode(cfg.default_pin);
        setAddress(cfg.default_address);
        setLat(cfg.map.lat);
        setLng(cfg.map.lng);
        setConfigReady(true);
      })
      .catch(() => setConfigReady(true));
  }, []);

  // Initialize interactive Leaflet map for location picking
  useEffect(() => {
    if (!configReady || !mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current).setView([lat, lng], 13);
    mapInstanceRef.current = map;

    L.tileLayer(tileUrl, {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Custom pulse pin icon
    const customIcon = L.divIcon({
      className: 'custom-pin',
      html: `<div class="relative flex items-center justify-center">
              <span class="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-indigo-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-4 w-4 bg-indigo-600 border-2 border-white shadow-md"></span>
            </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    const marker = L.marker([lat, lng], { icon: customIcon, draggable: true }).addTo(map);
    markerRef.current = marker;

    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      const nextLat = Number(pos.lat.toFixed(5));
      const nextLng = Number(pos.lng.toFixed(5));
      setLat(nextLat);
      setLng(nextLng);
      reverseGeocode(nextLat, nextLng);
    });

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      const nextLat = Number(e.latlng.lat.toFixed(5));
      const nextLng = Number(e.latlng.lng.toFixed(5));
      setLat(nextLat);
      setLng(nextLng);
      reverseGeocode(nextLat, nextLng);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [configReady]);

  const reverseGeocode = async (newLat: number, newLng: number) => {
    try {
      const res = await fetch(`/api/reverse-geocode?lat=${newLat}&lng=${newLng}`);
      if (!res.ok) return;
      const data = await res.json();
      const result = data.result;
      if (!result) return;
      if (result.street) setAddress(result.street);
      else if (result.display_name) setAddress(result.display_name.split(',').slice(0, 2).join(',').trim());
      if (result.city) setCity(result.city);
      if (result.state) setStateName(result.state);
      if (result.pin) setPinCode(result.pin);
    } catch {
      // Nominatim rate-limits; coordinates still saved
    }
  };

  // Update marker position if coordinates change manually
  const updateCoordinates = (newLat: number, newLng: number, doReverse = true) => {
    setLat(newLat);
    setLng(newLng);
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
      mapInstanceRef.current.setView([newLat, newLng], 14);
    }
    if (doReverse) reverseGeocode(newLat, newLng);
  };

  // Real-time AI prediction on description changes (debounced)
  useEffect(() => {
    if (!description.trim() || description.trim().length < 8) {
      setPrediction(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsPredicting(true);
      try {
        const res = await fetch('/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description })
        });
        if (res.ok) {
          const data: PredictionResult = await res.json();
          setPrediction(data);
          setCategory(data.category);
          setDepartment(data.department);
          setPriority(data.suggested_priority);
        }
      } catch (err) {
        console.error('Error fetching AI prediction:', err);
      } finally {
        setIsPredicting(false);
      }
    }, 380);

    return () => clearTimeout(timer);
  }, [description]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        issue_description: description,
        issue_type: category || prediction?.category || 'other',
        municipal_department: department || prediction?.department || 'City Administration',
        priority_level: priority,
        location_street_address: address,
        location_city: city,
        location_state: stateName,
        location_postal_code: pinCode,
        location_country: 'India',
        latitude: lat,
        longitude: lng,
        photo_url: photoUrl,
        is_anonymous: isAnonymous,
        resident_name: isAnonymous ? 'Anonymous Citizen' : residentName,
        resident_email: isAnonymous ? '' : residentEmail,
        resident_phone: isAnonymous ? '' : residentPhone
      };

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newReport: Report = await res.json();
        setSubmittedReport(newReport);
        onReportCreated(newReport);
      } else {
        alert('Failed to submit report. Please try again.');
      }
    } catch (err) {
      console.error('Error creating report:', err);
      alert('Network error connecting to city server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyReportId = () => {
    if (submittedReport) {
      navigator.clipboard.writeText(submittedReport.report_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Header Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Powered by Machine Learning Classifier
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
          Report a Municipal Issue
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">
          Describe the problem in Hindi, English, or Hinglish. CityFix classifies it, scores urgency, and routes it to PWD, Jal Board, Traffic Police, or Nagar Nigam.
        </p>
      </div>

      {/* Quick Test Prompt Chips */}
      <div className="mb-6 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-2.5">
          <Info className="w-4 h-4 text-indigo-400" />
          Quick Test Examples (click to autofill & test AI):
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setDescription(item.text);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/60 hover:bg-indigo-600/30 text-slate-300 hover:text-white border border-slate-600/50 transition-all cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Issue Description */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-[11px] font-bold text-white">1</span>
              Issue Description
            </label>
            {isPredicting && (
              <span className="text-xs text-indigo-400 flex items-center gap-1.5 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" /> AI analyzing text...
              </span>
            )}
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="E.g., Nala jaam ho gaya hai Sector 18 crossing pe, monsoon me flooding ho rahi hai..."
            className="w-full px-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
            required
          />

          {/* Real-Time AI Auto-Classification Card */}
          {prediction && (
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-indigo-950/70 via-slate-800 to-slate-900 border border-indigo-500/40 shadow-inner">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs text-indigo-300 font-medium uppercase tracking-wider block">
                      AI Detected Category
                    </span>
                    <span className="text-sm font-bold text-white capitalize">
                      {prediction.category.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Confidence</span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {(prediction.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Assigned Dept</span>
                    <span className="text-xs font-semibold text-cyan-300">
                      {prediction.department}
                    </span>
                  </div>
                </div>
              </div>

              {/* Confidence Meter Bar */}
              <div className="w-full bg-slate-700/60 rounded-full h-1.5 mb-2.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(15, prediction.confidence * 100))}%` }}
                />
              </div>

              {/* Alternative Predictions */}
              {prediction.top_predictions.length > 1 && (
                <div className="flex items-center gap-2 text-[11px] text-slate-400 overflow-x-auto pt-1">
                  <span className="text-slate-500">Other possibilities:</span>
                  {prediction.top_predictions.slice(1, 4).map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCategory(p.category);
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
                    >
                      {p.category.replace(/_/g, ' ')} ({Math.round(p.confidence * 100)}%)
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Department and Category manual override */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-700/50">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Issue Category
              </label>
              <select
                value={category || prediction?.category || 'pothole'}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="pothole">Pothole / Gaddha</option>
                <option value="water_leakage">Water Leak / Pipeline</option>
                <option value="drainage">Drainage / Nala / Manhole</option>
                <option value="streetlight">Streetlight / Electric Pole</option>
                <option value="garbage">Garbage / Kachra</option>
                <option value="illegal_dumping">Illegal Dumping / Malba</option>
                <option value="illegal_parking">Illegal Parking</option>
                <option value="noise">Noise / Loudspeaker</option>
                <option value="graffiti">Graffiti / Posters</option>
                <option value="stray_animals">Stray Animals / Cattle</option>
                <option value="encroachment">Encroachment / Hawkers</option>
                <option value="other">Other Civic Issue</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Dispatch Department
              </label>
              <input
                type="text"
                value={department || prediction?.department || 'Public Works Department (PWD)'}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Location on Interactive Map */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-[11px] font-bold text-white">2</span>
              Location & Geotagging
            </label>
            <span className="text-xs text-slate-400">
              Click anywhere on the map to place pinpoint
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2 relative">
              <label className="block text-xs font-medium text-slate-300 mb-1">Search Indian address / landmark</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={placeQuery}
                  onChange={(e) => setPlaceQuery(e.target.value)}
                  placeholder="E.g., Connaught Place, Andheri Metro, Koramangala"
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!placeQuery.trim()) return;
                    setSearchingPlace(true);
                    try {
                      const res = await fetch(`/api/geocode?q=${encodeURIComponent(placeQuery.trim())}`);
                      if (res.ok) {
                        const data = await res.json();
                        setPlaceResults(data.results || []);
                      }
                    } finally {
                      setSearchingPlace(false);
                    }
                  }}
                  className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  {searchingPlace ? 'Searching…' : 'Find'}
                </button>
              </div>
              {placeResults.length > 0 && (
                <div className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900">
                  {placeResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        updateCoordinates(item.latitude, item.longitude, false);
                        setAddress(item.street || item.display_name.split(',')[0]);
                        if (item.city) setCity(item.city);
                        if (item.state) setStateName(item.state);
                        if (item.pin) setPinCode(item.pin);
                        setPlaceResults([]);
                      }}
                      className="w-full text-left px-3 py-2 text-[11px] text-slate-300 hover:bg-slate-800 border-b border-slate-800 last:border-0"
                    >
                      {item.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Street / Locality</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="E.g., MG Road, Sector 18"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">State</label>
              <input
                type="text"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">PIN Code</label>
              <input
                type="text"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="110001"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Interactive Map Picker */}
          <div className="h-64 w-full rounded-xl overflow-hidden border border-slate-700 relative">
            <div ref={mapContainerRef} className="w-full h-full" />
            <div className="absolute bottom-2 left-2 z-20 bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] text-slate-300 font-mono shadow-md flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              <span>Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}</span>
            </div>
          </div>

          {/* Quick city presets */}
          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-400">
            <span>Jump to city:</span>
            {(cities.length ? cities : [
              { city: 'New Delhi', lat: 28.6139, lng: 77.2090, state: 'Delhi', pin: '110001', label: 'New Delhi' },
              { city: 'Mumbai', lat: 19.0760, lng: 72.8777, state: 'Maharashtra', pin: '400001', label: 'Mumbai' },
              { city: 'Bengaluru', lat: 12.9716, lng: 77.5946, state: 'Karnataka', pin: '560001', label: 'Bengaluru' },
              { city: 'Hyderabad', lat: 17.3850, lng: 78.4867, state: 'Telangana', pin: '500001', label: 'Hyderabad' },
              { city: 'Chennai', lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu', pin: '600001', label: 'Chennai' },
              { city: 'Pune', lat: 18.5204, lng: 73.8567, state: 'Maharashtra', pin: '411001', label: 'Pune' }
            ]).slice(0, 8).map((c) => (
              <button
                key={c.city}
                type="button"
                onClick={() => {
                  setCity(c.city);
                  setStateName(c.state);
                  setPinCode(c.pin);
                  updateCoordinates(c.lat, c.lng, false);
                }}
                className="px-2 py-0.5 rounded bg-slate-700/60 hover:bg-slate-700 text-slate-300 text-[11px]"
              >
                {c.city}
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Priority & Photos */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 shadow-xl">
          <label className="text-sm font-semibold text-slate-200 flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-[11px] font-bold text-white">3</span>
            Priority Level & Photo Evidence
          </label>

          {/* Priority Pills */}
          <div className="mb-4">
            <span className="block text-xs font-medium text-slate-300 mb-2">Urgency Assessment</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['low', 'medium', 'high', 'critical'] as const).map((lvl) => {
                const colors = {
                  low: 'hover:border-slate-500 peer-checked:bg-slate-700 peer-checked:border-slate-400 peer-checked:text-white',
                  medium: 'hover:border-amber-500 peer-checked:bg-amber-500/20 peer-checked:border-amber-500 peer-checked:text-amber-300',
                  high: 'hover:border-orange-500 peer-checked:bg-orange-500/20 peer-checked:border-orange-500 peer-checked:text-orange-300',
                  critical: 'hover:border-rose-500 peer-checked:bg-rose-500/20 peer-checked:border-rose-500 peer-checked:text-rose-300'
                };
                return (
                  <label
                    key={lvl}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-700 bg-slate-900/60 cursor-pointer text-xs font-semibold capitalize transition-all ${
                      priority === lvl ? 'ring-2 ring-indigo-500 bg-slate-800 text-white' : 'text-slate-400'
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={lvl}
                      checked={priority === lvl}
                      onChange={() => setPriority(lvl)}
                      className="sr-only"
                    />
                    <span className={`w-2 h-2 rounded-full ${
                      lvl === 'critical' ? 'bg-rose-500' :
                      lvl === 'high' ? 'bg-orange-500' :
                      lvl === 'medium' ? 'bg-amber-400' : 'bg-slate-400'
                    }`} />
                    {lvl}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Photo Attachment Picker */}
          <div>
            <span className="block text-xs font-medium text-slate-300 mb-1.5">Attach Photo (Optional)</span>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {SAMPLE_PHOTOS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPhotoUrl(p.url)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition ${
                    photoUrl === p.url 
                      ? 'bg-indigo-600/30 border-indigo-500 text-white font-medium' 
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Use sample {p.label} photo
                </button>
              ))}
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl('')}
                  className="text-xs text-rose-400 hover:underline ml-2"
                >
                  Remove
                </button>
              )}
            </div>

            {photoUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-700 max-w-sm h-40">
                <img src={photoUrl} alt="Report preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 text-center hover:border-slate-600 transition">
                <Camera className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                <p className="text-xs text-slate-400">Click a sample photo above or paste image URL below</p>
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="mt-2 w-full max-w-md px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                />
              </div>
            )}
          </div>
        </div>

        {/* Step 4: Resident Contact & Privacy */}
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-[11px] font-bold text-white">4</span>
              Contact Information
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-400">Submit Anonymously</span>
            </label>
          </div>

          {!isAnonymous ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" /> Full Name
                </label>
                <input
                  type="text"
                  value={residentName}
                  onChange={(e) => setResidentName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                  required={!isAnonymous}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" /> Email Address
                </label>
                <input
                  type="email"
                  value={residentEmail}
                  onChange={(e) => setResidentEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                  required={!isAnonymous}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" /> Phone Number
                </label>
                <input
                  type="tel"
                  value={residentPhone}
                  onChange={(e) => setResidentPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                />
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700 text-xs text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Your personal contact details will not be stored or visible to municipal staff.</span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !description.trim()}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting Ticket to Municipal Dispatch...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Municipal Report
              </>
            )}
          </button>
        </div>
      </form>

      {/* Success Modal */}
      {submittedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-white mb-1">Report Submitted Successfully!</h3>
            <p className="text-xs text-slate-400 mb-5">
              Your civic report has been logged and dispatched to the <span className="text-indigo-400 font-semibold">{submittedReport.municipal_department}</span>.
            </p>

            {/* Ticket ID Box */}
            <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 mb-5 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Your Tracking ID</span>
                <button
                  onClick={copyReportId}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="text-xl font-mono font-extrabold text-white">
                {submittedReport.report_id}
              </div>
              <div className="text-[11px] text-slate-400 mt-2 flex items-center justify-between">
                <span>Category: <strong className="text-slate-200 capitalize">{submittedReport.issue_type.replace(/_/g, ' ')}</strong></span>
                <span>Priority: <strong className="text-amber-400 capitalize">{submittedReport.priority_level}</strong></span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  onNavigateToTrack(submittedReport.report_id);
                  setSubmittedReport(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
              >
                Track Status Now
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setSubmittedReport(null);
                  setDescription('');
                  setPrediction(null);
                }}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Submit Another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
