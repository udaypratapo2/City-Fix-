export interface Report {
  report_id: string;
  resident_id?: string;
  resident_name?: string;
  resident_email?: string;
  resident_phone?: string;
  issue_type: string;
  issue_description: string;
  issue_status: 'submitted' | 'in-progress' | 'resolved';
  report_datetime: string;
  location_street_address?: string;
  location_city?: string;
  location_state?: string;
  location_postal_code?: string;
  location_country?: string;
  latitude?: number;
  longitude?: number;
  photo_url?: string;
  municipal_department?: string;
  resolution_datetime?: string | null;
  resolution_notes?: string | null;
  is_anonymous?: boolean;
  priority_level?: 'low' | 'medium' | 'high' | 'critical';
  priority_score?: number;
  severity_score?: number;
  area_importance?: number;
  citizen_reports_count?: number;
}

export interface PredictionResult {
  category: string;
  confidence: number;
  department: string;
  suggested_priority: 'low' | 'medium' | 'high' | 'critical';
  suggested_severity: number;
  area_importance?: number;
  top_predictions: Array<{
    category: string;
    confidence: number;
  }>;
}

export interface MapCity {
  label: string;
  city: string;
  state: string;
  pin: string;
  lat: number;
  lng: number;
}

export interface AppConfig {
  region: string;
  country: string;
  default_city: string;
  default_state: string;
  default_pin: string;
  default_address: string;
  map: {
    provider: string;
    lat: number;
    lng: number;
    zoom: number;
    tile_url: string;
    attribution: string;
    geocoder: string;
    key_configured: boolean;
  };
  cities: MapCity[];
  categories: CategoryInfo[];
  department_mapping: Record<string, string>;
}

export interface StatsData {
  total_reports: number;
  by_status: {
    submitted: number;
    'in-progress': number;
    resolved: number;
  };
  by_category: Record<string, number>;
  by_department: Record<string, number>;
  by_priority: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  resolution_rate: number;
  avg_priority_score: number;
  critical_and_high_count: number;
}

export interface CategoryInfo {
  id: string;
  label: string;
  icon: string;
}
