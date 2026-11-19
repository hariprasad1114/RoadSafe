export const APP_NAME = "RoadSafe AI";

export const MODEL_VERSION = "v1.2.0";

export const DATASET_ROWS = 105982;

export const DATASET_LABEL = "UK DfT 2022 collisions";

export const UK_CENTER: [number, number] = [13.4428, 79.5544]; // Default to Puttur, Chittoor, Andhra Pradesh

export const PUTTUR_CHITTOOR_CENTER: [number, number] = [13.4428, 79.5544];

export interface LocationPreset {
  id: string;
  name: string;
  shortName: string;
  category: "Urban" | "Highway" | "Intersection" | "Rural";
  latitude: number;
  longitude: number;
  description: string;
  defaultSpeedLimit: number;
  roadType: "Urban Road" | "Highway" | "Intersection" | "Rural Road";
}

export const PUTTUR_LOCATIONS: LocationPreset[] = [
  {
    id: "puttur-town",
    name: "Puttur Town Center (Bus Station & Market)",
    shortName: "Puttur Town",
    category: "Urban",
    latitude: 13.4428,
    longitude: 79.5544,
    description: "Commercial heart of Puttur with dense pedestrian, two-wheeler and auto traffic.",
    defaultSpeedLimit: 30,
    roadType: "Urban Road",
  },
  {
    id: "puttur-station",
    name: "Puttur Railway Station Junction",
    shortName: "Railway Junction",
    category: "Intersection",
    latitude: 13.4395,
    longitude: 79.5582,
    description: "Busy railway approach intersection with high cross-traffic and pedestrian activity.",
    defaultSpeedLimit: 30,
    roadType: "Intersection",
  },
  {
    id: "puttur-tirupati-nh716",
    name: "Puttur - Tirupati Road (NH 716 Corridor)",
    shortName: "Tirupati Road (NH 716)",
    category: "Highway",
    latitude: 13.4750,
    longitude: 79.5420,
    description: "High-speed national highway carrying pilgrimage buses, heavy freight, and private vehicles.",
    defaultSpeedLimit: 70,
    roadType: "Highway",
  },
  {
    id: "puttur-nagari-road",
    name: "Puttur - Nagari Road (SH 61)",
    shortName: "Nagari Road",
    category: "Rural",
    latitude: 13.4050,
    longitude: 79.5850,
    description: "Inter-district connecting corridor featuring curves, bridges, and mixed agricultural traffic.",
    defaultSpeedLimit: 50,
    roadType: "Rural Road",
  },
  {
    id: "puttur-chittoor-road",
    name: "Puttur - Chittoor Road (District Highway)",
    shortName: "Chittoor Highway",
    category: "Rural",
    latitude: 13.3850,
    longitude: 79.4620,
    description: "Arterial link connecting Puttur to Chittoor town with fast-moving regional commuter traffic.",
    defaultSpeedLimit: 60,
    roadType: "Rural Road",
  },
  {
    id: "chittoor-city",
    name: "Chittoor City Collectorate Junction",
    shortName: "Chittoor City",
    category: "Urban",
    latitude: 13.2172,
    longitude: 79.1003,
    description: "District headquarters commercial junction with complex vehicular and pedestrian movement.",
    defaultSpeedLimit: 40,
    roadType: "Intersection",
  },
  {
    id: "tirupati-highway",
    name: "Tirupati Highway Gateway (Bypass / Alipiri)",
    shortName: "Tirupati Gateway",
    category: "Highway",
    latitude: 13.6288,
    longitude: 79.4192,
    description: "Major junction point for buses and long-distance passenger travel towards Tirupati.",
    defaultSpeedLimit: 60,
    roadType: "Highway",
  },
];

export const UK_BOUNDS: [[number, number], [number, number]] = [
  [49.5, -8.5],
  [61.2, 2.2],
];

export const DEMO_ACCOUNTS = [
  {
    role: "Admin",
    email: "admin@roadsafe.app",
    password: "RoadSafeDemo2026!",
    description: "Full access including dataset uploads",
  },
  {
    role: "Analyst",
    email: "analyst@roadsafe.app",
    password: "RoadSafeDemo2026!",
    description: "Prediction history and analysis",
  },
];

export const SPEED_LIMITS = [20, 30, 40, 50, 60, 70];

export const RISK_FACTOR_ICONS: Record<string, string> = {
  is_night: "moon",
  is_poor_lighting: "lightbulb-off",
  is_wet: "cloud-rain",
  is_high_speed: "gauge",
  is_two_wheeler: "bike",
  is_intersection: "git-fork",
  is_weekend: "calendar",
};

export const CATEGORY_STYLES: Record<
  string,
  { label: string; tone: "sky" | "rose" | "emerald" | "amber" | "indigo" }
> = {
  engineering: { label: "Engineering", tone: "sky" },
  enforcement: { label: "Enforcement", tone: "rose" },
  education: { label: "Education", tone: "emerald" },
  emergency: { label: "Emergency response", tone: "amber" },
  data: { label: "Data and evaluation", tone: "indigo" },
};
