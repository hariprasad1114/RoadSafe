export type Severity = "Minor" | "Serious" | "Fatal";

export type RiskLevelKey = "low" | "moderate" | "high" | "very_high";

export type Priority = "critical" | "high" | "medium" | "low";

export type UserRole = "admin" | "analyst" | "viewer";

export interface AuthUser {
  id: string;
  email: string | null;
  profile?: Record<string, unknown> | null;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  organisation: string | null;
  created_at: string | null;
  updated_at?: string | null;
}

export interface RiskLevel {
  key: RiskLevelKey;
  label: string;
  min_severe_probability: number;
}

export interface PredictionRequest {
  latitude: number;
  longitude: number;
  road_type: string;
  weather: string;
  road_condition: string;
  time_of_day: string;
  day_of_week: string;
  vehicle_type: string;
  speed_limit: number;
  lighting_condition: string;
  session_id?: string | null;
}

export interface PredictionRecommendation {
  slug: string;
  title: string;
  category: string;
  priority: Priority;
  summary: string;
  impact_estimate: string;
}

export interface NearbyHotspot {
  label: string;
  cluster_id: number;
  latitude: number;
  longitude: number;
  distance_km: number;
  risk_score: number;
  accident_count: number;
}

export interface RiskFactor {
  key: string;
  label: string;
}

export interface PredictionResponse {
  predicted_severity: Severity;
  probabilities: Record<Severity, number>;
  severe_probability: number;
  fatal_probability: number;
  risk_score: number;
  risk_level: RiskLevel;
  confidence: number;
  predicted_probability: number;
  risk_factors: RiskFactor[];
  recommendations: PredictionRecommendation[];
  nearby_hotspots: NearbyHotspot[];
  model: {
    name: string;
    version: string;
    kind: string;
    decision_rule: Record<string, number | string>;
  };
  probability_note: string | null;
  generated_at: string;
}

export interface DataStatus {
  source: string;
  loaded: boolean;
  rows: number;
  fetched_at: string | null;
  last_error: string | null;
}

export interface Metadata {
  model_name: string;
  model_kind: string;
  model_version: string;
  trained_at: string;
  dataset_rows: number;
  dataset_source: string;
  dataset_licence: string;
  class_order: Severity[];
  class_counts: Record<Severity, number>;
  features: string[];
  raw_features: string[];
  derived_features: string[];
  numeric_features: string[];
  categorical_features: string[];
  categories: Record<string, string[]>;
  ranges: Record<string, [number, number]>;
  bounds: {
    center_latitude: number;
    center_longitude: number;
    min_latitude: number;
    max_latitude: number;
    min_longitude: number;
    max_longitude: number;
  };
  defaults: PredictionRequest;
  decision_rule: Record<string, number | string>;
  risk_levels: RiskLevel[];
  risk_factors: Record<string, string>;
  probability_note: string | null;
  performance_note: string | null;
  disclaimer: string;
  api_version: string;
  data_status: DataStatus;
  hotspot_algorithms: Record<
    string,
    { label: string; clusters: number; description: string }
  >;
  dataset_columns: string[];
  dataset_template_example: Record<string, string>;
  dimensions: string[];
}

export interface AnalyticsSummary {
  total_accidents: number;
  severity_counts: Record<Severity, number>;
  severe_count: number;
  severe_rate: number;
  fatal_rate: number;
  date_range: { start: string | null; end: string | null };
  top_road_type: string | null;
  top_weather: string | null;
  average_speed_limit: number;
  night_share: number;
  wet_share: number;
  two_wheeler_share: number;
  data_source: string;
  generated_at: string;
}

export interface KpiSummary {
  total_accidents: number;
  severe_count: number;
  severe_rate: number;
  fatal_count: number;
  fatal_rate: number;
  top_road_type: string | null;
  top_weather: string | null;
  hotspot_count: number;
  recommendation_count: number;
  model: {
    name: string;
    version: string;
    accuracy: number;
    macro_f1: number;
    fatal_recall: number;
    serious_recall: number;
    trained_at: string;
  };
  data_source: string;
  generated_at: string;
}

export interface TrendPoint {
  period: string;
  label: string;
  total: number;
  fatal: number;
  serious: number;
  minor: number;
  severe: number;
  severe_rate: number;
}

export interface TrendsResponse {
  granularity: "day" | "week" | "month";
  points: TrendPoint[];
  data_source: string;
}

export interface DistributionValue {
  total: number;
  fatal: number;
  serious: number;
  minor: number;
  severe: number;
  severe_rate: number;
  share: number;
  [key: string]: string | number;
}

export interface DistributionResponse {
  dimension: string;
  label: string;
  values: DistributionValue[];
  total: number;
  data_source: string;
}

export interface Dimension {
  key: string;
  label: string;
}

export interface Hotspot {
  id?: string;
  cluster_id: number;
  algorithm: "kmeans" | "dbscan";
  label: string;
  latitude: number;
  longitude: number;
  accident_count: number;
  fatal_count: number;
  serious_count: number;
  minor_count: number;
  severity_rate: number;
  radius_km: number;
  top_road_type: string | null;
  top_weather: string | null;
  risk_score: number;
  created_at?: string;
}

export interface HotspotListResponse {
  algorithm: "kmeans" | "dbscan";
  count: number;
  clusters: Hotspot[];
  source: string;
  generated_at: string;
}

export interface HotspotSummary {
  algorithm: string;
  cluster_count: number;
  covered_accidents: number;
  average_risk: number;
  highest_risk: number;
  top_clusters: Hotspot[];
}

export interface HotspotClusterParams {
  algorithm: "kmeans" | "dbscan";
  n_clusters: number;
  eps_km: number;
  min_samples: number;
  severity: Severity[] | null;
  road_type: string | null;
  date_from: string | null;
  date_to: string | null;
}

export interface HotspotClusterResponse {
  algorithm: "kmeans" | "dbscan";
  params: HotspotClusterParams;
  total_points: number;
  sampled_points: number;
  noise_count: number;
  noise_percentage: number;
  cluster_count: number;
  clusters: Hotspot[];
  generated_at: string;
}

export interface Recommendation {
  id?: string;
  slug: string;
  title: string;
  category: string;
  priority: Priority;
  summary: string;
  detail: string;
  evidence: string;
  impact_estimate: string;
  road_type: string | null;
  weather: string | null;
  sort_order: number;
  is_active?: boolean;
}

export interface RecommendationListResponse {
  count: number;
  categories: Record<string, string>;
  recommendations: Recommendation[];
  generated_at: string;
}

export interface DatasetReport {
  file_name: string;
  size_bytes: number;
  row_count: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  severity_counts: Record<Severity, number>;
  date_range: { start: string | null; end: string | null };
  missing_columns: string[];
  extra_columns: string[];
  invalid_reasons: Record<string, number>;
  preview: Record<string, string | number>[];
  validated_at: string;
  imported_rows?: number;
  storage_error?: string | null;
}

export interface DatasetValidationResponse {
  status: string;
  report: DatasetReport;
  can_import: boolean;
  requested_by: string;
}

export interface DatasetImportResponse {
  upload_id: string;
  status: string;
  report: DatasetReport;
  storage: { key: string | null; url: string | null };
}

export interface DatasetUpload {
  id: string;
  uploaded_by: string;
  file_name: string;
  storage_key: string | null;
  storage_url: string | null;
  row_count: number;
  valid_rows: number;
  invalid_rows: number;
  status: "validated" | "validating" | "imported" | "failed";
  summary: DatasetReport | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatasetUploadListResponse {
  count: number;
  uploads: DatasetUpload[];
}

export interface PredictionHistoryRecord {
  id: string;
  user_id: string | null;
  session_id: string | null;
  input: PredictionRequest;
  predicted_severity: Severity;
  probabilities: Record<Severity, number>;
  model_version: string;
  created_at: string;
}

export interface PredictionHistoryResponse {
  count: number;
  predictions: PredictionHistoryRecord[];
}
