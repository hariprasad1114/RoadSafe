export const APP_NAME = "RoadSafe AI";

export const MODEL_VERSION = "v1.2.0";

export const DATASET_ROWS = 105982;

export const DATASET_LABEL = "UK DfT 2022 collisions";

export const UK_CENTER: [number, number] = [54.2, -2.6];

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
