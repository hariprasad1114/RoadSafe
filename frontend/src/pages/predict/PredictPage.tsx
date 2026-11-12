import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  MapPinned,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ErrorState, LoadingState } from "@/components/ui/Feedback";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useApi } from "@/hooks/useApi";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { Metadata, PredictionRequest, PredictionResponse } from "@/types";
import { api, errorMessage } from "@/lib/api";
import { PredictionMap } from "@/components/maps/PredictionMap";
import { ProbabilityBars } from "@/components/charts/ProbabilityBars";
import { RiskGauge } from "@/components/charts/RiskGauge";
import { cn, formatNumber, formatPercent } from "@/lib/utils";

const TIME_OPTIONS = ["Morning", "Afternoon", "Evening", "Night"];
const DAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const WEATHER_OPTIONS = ["Clear", "Cloudy", "Rainy", "Foggy", "Snowy", "Other"];
const ROAD_CONDITION_OPTIONS = ["Dry", "Wet", "Snowy/Icy", "Flooded", "Other"];
const ROAD_TYPE_OPTIONS = ["Urban Road", "Highway", "Rural Road", "Intersection"];
const VEHICLE_OPTIONS = ["Car", "Two-Wheeler", "Truck", "Bus", "Other"];
const LIGHTING_OPTIONS = ["Good", "Moderate", "Poor", "No Lighting", "Other"];

export function PredictPage() {
  useDocumentTitle("Predict severity");
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: metadata } = useApi<Metadata>("/api/v1/metadata");
  const defaults = metadata?.defaults;
  const categories = metadata?.categories;
  const bounds = metadata?.bounds;
  const mapBounds = bounds
    ? {
        minLatitude: bounds.min_latitude,
        maxLatitude: bounds.max_latitude,
        minLongitude: bounds.min_longitude,
        maxLongitude: bounds.max_longitude,
      }
    : undefined;

  const [latitude, setLatitude] = useState(51.5074);
  const [longitude, setLongitude] = useState(-0.1278);
  const [roadType, setRoadType] = useState("Urban Road");
  const [weather, setWeather] = useState("Clear");
  const [roadCondition, setRoadCondition] = useState("Dry");
  const [timeOfDay, setTimeOfDay] = useState("Afternoon");
  const [dayOfWeek, setDayOfWeek] = useState("Friday");
  const [vehicleType, setVehicleType] = useState("Car");
  const [speedLimit, setSpeedLimit] = useState(30);
  const [lighting, setLighting] = useState("Good");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!defaults) return;
    setLatitude(defaults.latitude);
    setLongitude(defaults.longitude);
    setRoadType(defaults.road_type);
    setWeather(defaults.weather);
    setRoadCondition(defaults.road_condition);
    setTimeOfDay(defaults.time_of_day);
    setDayOfWeek(defaults.day_of_week);
    setVehicleType(defaults.vehicle_type);
    setSpeedLimit(defaults.speed_limit);
    setLighting(defaults.lighting_condition);
  }, [defaults]);

  useEffect(() => {
    if (!categories) return;
    const pick = (key: string, fallback: string) => (current: string) => {
      const allowed = categories[key] || [];
      if (!allowed.length || allowed.includes(current)) return current;
      return allowed.includes(fallback) ? fallback : allowed[0];
    };
    setRoadType(pick("road_type", "Urban Road"));
    setWeather(pick("weather", "Clear"));
    setRoadCondition(pick("road_condition", "Dry"));
    setTimeOfDay(pick("time_of_day", "Afternoon"));
    setDayOfWeek(pick("day_of_week", "Friday"));
    setVehicleType(pick("vehicle_type", "Car"));
    setLighting(pick("lighting_condition", "Good"));
  }, [categories]);

  const roadTypes = categories?.road_type || ROAD_TYPE_OPTIONS;
  const weathers = categories?.weather || WEATHER_OPTIONS;
  const roadConditions = categories?.road_condition || ROAD_CONDITION_OPTIONS;
  const times = categories?.time_of_day || TIME_OPTIONS;
  const days = categories?.day_of_week || DAY_OPTIONS;
  const vehicles = categories?.vehicle_type || VEHICLE_OPTIONS;
  const lightings = categories?.lighting_condition || LIGHTING_OPTIONS;

  async function handleSubmit() {
    setError(null);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError("Enter valid numeric coordinates before predicting.");
      return;
    }
    if (
      bounds &&
      (latitude < bounds.min_latitude ||
        latitude > bounds.max_latitude ||
        longitude < bounds.min_longitude ||
        longitude > bounds.max_longitude)
    ) {
      setError(
        `Location is outside the UK area covered by the dataset. Latitude must be between ` +
          `${bounds.min_latitude.toFixed(4)} and ${bounds.max_latitude.toFixed(4)}, and ` +
          `longitude between ${bounds.min_longitude.toFixed(4)} and ${bounds.max_longitude.toFixed(4)}.`,
      );
      return;
    }
    setSubmitting(true);
    try {
      const payload: PredictionRequest = {
        latitude,
        longitude,
        road_type: roadType,
        weather,
        road_condition: roadCondition,
        time_of_day: timeOfDay,
        day_of_week: dayOfWeek,
        vehicle_type: vehicleType,
        speed_limit: speedLimit,
        lighting_condition: lighting,
      };
      const response = await api.post<PredictionResponse>(
        "/api/v1/predict",
        payload,
        { auth: Boolean(user) },
      );
      setResult(response);
      toast({
        title: `Predicted: ${response.predicted_severity}`,
        description: `${response.risk_level.label} risk · ${formatPercent(
          response.severe_probability,
        )} severe probability`,
        variant:
          response.predicted_severity === "Fatal"
            ? "error"
            : response.predicted_severity === "Serious"
              ? "info"
              : "success",
      });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
  }

  const activeRiskFactors = result?.risk_factors || [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Predictive intelligence"
        title="Predict collision severity"
        description="Estimate Minor, Serious or Fatal outcomes from a location and its context. Every result exposes probabilities, risk drivers and nearby hotspots."
        actions={
          result ? (
            <Button variant="outline" size="sm" onClick={reset}>
              New scenario
            </Button>
          ) : null
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader
            title="Scenario inputs"
            description="Adjust the location and conditions. Click the map to move the pin."
          />
          <CardContent>
            <div className="space-y-5">
              <PredictionMap
                latitude={latitude}
                longitude={longitude}
                onChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                height={320}
                bounds={mapBounds}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Latitude" htmlFor="latitude">
                  <Input
                    id="latitude"
                    type="number"
                    step="0.00001"
                    min={bounds?.min_latitude ?? -90}
                    max={bounds?.max_latitude ?? 90}
                    value={latitude}
                    onChange={(event) => setLatitude(Number(event.target.value))}
                  />
                </FormField>
                <FormField label="Longitude" htmlFor="longitude">
                  <Input
                    id="longitude"
                    type="number"
                    step="0.00001"
                    min={bounds?.min_longitude ?? -180}
                    max={bounds?.max_longitude ?? 180}
                    value={longitude}
                    onChange={(event) => setLongitude(Number(event.target.value))}
                  />
                </FormField>
              </div>

              {bounds ? (
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Dataset coverage: {bounds.min_latitude.toFixed(2)}° to{" "}
                  {bounds.max_latitude.toFixed(2)}° latitude,{" "}
                  {bounds.min_longitude.toFixed(2)}° to{" "}
                  {bounds.max_longitude.toFixed(2)}° longitude.
                </p>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Road type" htmlFor="road-type" required>
                  <Select
                    id="road-type"
                    value={roadType}
                    onChange={(event) => setRoadType(event.target.value)}
                  >
                    {roadTypes.map((option: string) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Weather" htmlFor="weather" required>
                  <Select
                    id="weather"
                    value={weather}
                    onChange={(event) => setWeather(event.target.value)}
                  >
                    {weathers.map((option: string) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Road condition" htmlFor="road-condition" required>
                  <Select
                    id="road-condition"
                    value={roadCondition}
                    onChange={(event) => setRoadCondition(event.target.value)}
                  >
                    {roadConditions.map((option: string) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Time of day" htmlFor="time-of-day" required>
                  <Select
                    id="time-of-day"
                    value={timeOfDay}
                    onChange={(event) => setTimeOfDay(event.target.value)}
                  >
                    {times.map((option: string) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Day of week" htmlFor="day-of-week" required>
                  <Select
                    id="day-of-week"
                    value={dayOfWeek}
                    onChange={(event) => setDayOfWeek(event.target.value)}
                  >
                    {days.map((option: string) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Vehicle type" htmlFor="vehicle-type" required>
                  <Select
                    id="vehicle-type"
                    value={vehicleType}
                    onChange={(event) => setVehicleType(event.target.value)}
                  >
                    {vehicles.map((option: string) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Speed limit (mph)" htmlFor="speed-limit" required>
                  <Select
                    id="speed-limit"
                    value={speedLimit}
                    onChange={(event) => setSpeedLimit(Number(event.target.value))}
                  >
                    {(metadata?.ranges?.speed_limit
                      ? [20, 30, 40, 50, 60, 70]
                      : [20, 30, 40, 50, 60, 70]
                    ).map((option: number) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Lighting" htmlFor="lighting" required>
                  <Select
                    id="lighting"
                    value={lighting}
                    onChange={(event) => setLighting(event.target.value)}
                  >
                    {lightings.map((option: string) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>

              {error ? (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                  <span>{error}</span>
                </div>
              ) : null}

              <Button
                onClick={handleSubmit}
                loading={submitting}
                className="w-full"
                size="lg"
              >
                <Sparkles className="h-4 w-4" />
                Predict severity
                <ArrowRight className="h-4 w-4" />
              </Button>

              {!user ? (
                <p className="text-center text-[11px] leading-relaxed text-slate-500">
                  Guests can run predictions.{" "}
                  <Link to="/login" className="font-semibold text-ink-600 hover:text-ink-900">
                    Sign in
                  </Link>{" "}
                  to save history and link results to your profile.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {result ? (
            <>
              <Card>
                <CardHeader
                  title="Severity outcome"
                  description="Predicted class and probability distribution."
                />
                <CardContent>
                  <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                    <RiskGauge score={result.risk_score} label={result.risk_level.label} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                            result.predicted_severity === "Fatal"
                              ? "bg-rose-50 text-rose-700"
                              : result.predicted_severity === "Serious"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700",
                          )}
                        >
                          {result.predicted_severity}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatPercent(result.predicted_probability)} confidence
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">
                        Severe probability {formatPercent(result.severe_probability)} ·
                        Fatal probability {formatPercent(result.fatal_probability)}
                      </p>
                      <div className="mt-4">
                        <ProbabilityBars
                          probabilities={result.probabilities}
                          predicted={result.predicted_severity}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader
                  title="Risk drivers"
                  description="Derived factors that pushed the prediction toward a severe outcome."
                />
                <CardContent>
                  {activeRiskFactors.length ? (
                    <div className="flex flex-wrap gap-2">
                      {activeRiskFactors.map((factor) => (
                        <span
                          key={factor.key}
                          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-signal-500" />
                          {factor.label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed text-slate-500">
                      No strong risk drivers are active for this scenario.
                    </p>
                  )}
                  {result.probability_note ? (
                    <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                      {result.probability_note}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader
                  title="Nearby hotspots"
                  description="Precomputed K-Means clusters within 50 km of the location."
                />
                <CardContent>
                  {result.nearby_hotspots.length ? (
                    <div className="space-y-3">
                      {result.nearby_hotspots.map((hotspot) => (
                        <div
                          key={`${hotspot.cluster_id}-${hotspot.distance_km}`}
                          className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal-50 text-xs font-bold text-signal-700">
                            {hotspot.risk_score.toFixed(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-900">
                              {hotspot.label}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {formatNumber(hotspot.accident_count)} collisions ·{" "}
                              {hotspot.distance_km.toFixed(1)} km away
                            </p>
                          </div>
                          <Link
                            to={`/app/hotspots?focus=${hotspot.cluster_id}`}
                            className="text-[11px] font-semibold text-ink-600 hover:text-ink-900"
                          >
                            View
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed text-slate-500">
                      No precomputed hotspots are within 50 km of this location.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader
                  title="Recommended actions"
                  description="Interventions most relevant to the selected road type and weather."
                />
                <CardContent>
                  {result.recommendations.length ? (
                    <div className="space-y-3">
                      {result.recommendations.map((item) => (
                        <div
                          key={item.slug}
                          className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-900">
                              {item.title}
                            </p>
                            <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-600">
                              {item.priority}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                            {item.summary}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No recommendations matched.</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-50 text-signal-600">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-slate-950">
                Run your first scenario
              </h3>
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
                Set the location and context on the left, then click predict. The
                result will appear here with probabilities, risk drivers, nearby
                hotspots and recommended actions.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400">
                <span className="rounded-full border border-slate-200 px-2.5 py-1">
                  105,982 training records
                </span>
                <span className="rounded-full border border-slate-200 px-2.5 py-1">
                  Hierarchical RF
                </span>
                <span className="rounded-full border border-slate-200 px-2.5 py-1">
                  79 hotspots
                </span>
              </div>
            </Card>
          )}
        </div>
      </div>

      {result ? (
        <Card>
          <CardHeader
            title="Model transparency"
            description="Details about the model that produced this prediction."
          />
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Model", result.model.name],
                ["Version", result.model.version],
                ["Kind", result.model.kind],
                ["Fatal threshold", String(result.model.decision_rule.fatal_threshold ?? "—")],
                ["Serious weight", String(result.model.decision_rule.serious_weight ?? "—")],
                ["Severe probability", formatPercent(result.severe_probability)],
                ["Confidence", formatPercent(result.confidence)],
                ["Generated", new Date(result.generated_at).toLocaleString("en-GB")],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {label}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
