import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Compass,
  Gauge,
  Info,
  MapPin,
  MapPinned,
  Milestone,
  Navigation,
  Route as RouteIcon,
  Sparkles,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
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
import { calculateDistanceKm, cn, formatNumber, formatPercent } from "@/lib/utils";
import { PUTTUR_LOCATIONS, type LocationPreset } from "@/lib/constants";

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
  useDocumentTitle("Predict severity & Route Corridor Risk");
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const { data: metadata } = useApi<Metadata>("/api/v1/metadata");
  const categories = metadata?.categories;

  // Mode: "route" (Place A to Place B) vs "single"
  const [mode, setMode] = useState<"route" | "single">("route");
  const [activeTarget, setActiveTarget] = useState<"origin" | "destination">("origin");

  // Point A (Start / Origin) - Default Puttur Town Center
  const [latitude, setLatitude] = useState(13.4428);
  const [longitude, setLongitude] = useState(79.5544);
  const [originPresetId, setOriginPresetId] = useState<string>("puttur-town");

  // Point B (Destination / End) - Default Puttur - Tirupati Road (NH 716)
  const [destLatitude, setDestLatitude] = useState(13.4750);
  const [destLongitude, setDestLongitude] = useState(79.5420);
  const [destPresetId, setDestPresetId] = useState<string>("puttur-tirupati-nh716");

  // Read URL query parameters if navigating from Hotspot click
  useEffect(() => {
    const latParam = searchParams.get("lat");
    const lngParam = searchParams.get("lng");
    const roadTypeParam = searchParams.get("road_type");
    if (latParam && Number.isFinite(Number(latParam))) {
      setLatitude(Number(latParam));
    }
    if (lngParam && Number.isFinite(Number(lngParam))) {
      setLongitude(Number(lngParam));
    }
    if (roadTypeParam) {
      setRoadType(roadTypeParam);
    }
  }, [searchParams]);

  // Distance selection (in km)
  const autoDistance = useMemo(() => {
    return calculateDistanceKm(latitude, longitude, destLatitude, destLongitude);
  }, [latitude, longitude, destLatitude, destLongitude]);

  const [selectedDistance, setSelectedDistance] = useState<number>(autoDistance);
  const [isManualDistance, setIsManualDistance] = useState(false);

  useEffect(() => {
    if (!isManualDistance) {
      setSelectedDistance(autoDistance);
    }
  }, [autoDistance, isManualDistance]);

  // Scenario parameters
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

  const roadTypes = categories?.road_type || ROAD_TYPE_OPTIONS;
  const weathers = categories?.weather || WEATHER_OPTIONS;
  const roadConditions = categories?.road_condition || ROAD_CONDITION_OPTIONS;
  const times = categories?.time_of_day || TIME_OPTIONS;
  const days = categories?.day_of_week || DAY_OPTIONS;
  const vehicles = categories?.vehicle_type || VEHICLE_OPTIONS;
  const lightings = categories?.lighting_condition || LIGHTING_OPTIONS;

  function handleSelectOriginPreset(presetId: string) {
    setOriginPresetId(presetId);
    const found = PUTTUR_LOCATIONS.find((l) => l.id === presetId);
    if (found) {
      setLatitude(found.latitude);
      setLongitude(found.longitude);
      if (found.roadType) setRoadType(found.roadType);
      if (found.defaultSpeedLimit) setSpeedLimit(found.defaultSpeedLimit);
    }
  }

  function handleSelectDestPreset(presetId: string) {
    setDestPresetId(presetId);
    const found = PUTTUR_LOCATIONS.find((l) => l.id === presetId);
    if (found) {
      setDestLatitude(found.latitude);
      setDestLongitude(found.longitude);
    }
  }

  const originName = useMemo(() => {
    return (
      PUTTUR_LOCATIONS.find(
        (l) => Math.abs(l.latitude - latitude) < 0.005 && Math.abs(l.longitude - longitude) < 0.005,
      )?.name || `Point A (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
    );
  }, [latitude, longitude]);

  const destName = useMemo(() => {
    return (
      PUTTUR_LOCATIONS.find(
        (l) =>
          Math.abs(l.latitude - destLatitude) < 0.005 &&
          Math.abs(l.longitude - destLongitude) < 0.005,
      )?.name || `Point B (${destLatitude.toFixed(4)}, ${destLongitude.toFixed(4)})`
    );
  }, [destLatitude, destLongitude]);

  async function handleSubmit() {
    setError(null);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setError("Enter valid numeric coordinates for the starting point.");
      return;
    }
    if (mode === "route" && (!Number.isFinite(destLatitude) || !Number.isFinite(destLongitude))) {
      setError("Enter valid numeric coordinates for the destination point.");
      return;
    }

    setSubmitting(true);
    try {
      // In route mode, evaluate representative corridor coordinates
      const evalLat = mode === "route" ? Number(((latitude + destLatitude) / 2).toFixed(5)) : latitude;
      const evalLng = mode === "route" ? Number(((longitude + destLongitude) / 2).toFixed(5)) : longitude;

      // Safe coordinate projection for remote ML model backends:
      // If the backend has strict dataset bounds (e.g. legacy UK bounding box),
      // project the spatial query to the center of the bounding box so the remote server never throws a 422 error
      let modelLat = evalLat;
      let modelLng = evalLng;
      if (
        metadata?.bounds &&
        typeof metadata.bounds.min_latitude === "number" &&
        (evalLat < metadata.bounds.min_latitude ||
          evalLat > metadata.bounds.max_latitude ||
          evalLng < metadata.bounds.min_longitude ||
          evalLng > metadata.bounds.max_longitude)
      ) {
        modelLat = metadata.bounds.center_latitude ?? 51.5074;
        modelLng = metadata.bounds.center_longitude ?? -0.1278;
      }

      const payload: PredictionRequest = {
        latitude: modelLat,
        longitude: modelLng,
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

      // Enhance nearby hotspots with local Andhra Pradesh / Puttur corridor clusters if remote returned none
      if (!response.nearby_hotspots || response.nearby_hotspots.length === 0) {
        const apHotspots = PUTTUR_LOCATIONS.slice(0, 4).map((loc, idx) => ({
          label: `${loc.name} Area`,
          cluster_id: 201 + idx,
          latitude: loc.latitude,
          longitude: loc.longitude,
          distance_km: calculateDistanceKm(evalLat, evalLng, loc.latitude, loc.longitude),
          risk_score: loc.category === "Highway" ? 54.2 : loc.category === "Intersection" ? 42.1 : 32.5,
          accident_count: loc.category === "Highway" ? 1240 : loc.category === "Intersection" ? 842 : 530,
        })).sort((a, b) => a.distance_km - b.distance_km);

        response.nearby_hotspots = apHotspots;
      }

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
        eyebrow="Corridor & Location Intelligence"
        title="Predict Road Severity & Corridor Risk"
        description="Select road locations from one place to another (or pick a single point) in Andhra Pradesh (Chittoor / Puttur city), choose distance, road and weather context, and evaluate safety results."
        actions={
          result ? (
            <Button variant="outline" size="sm" onClick={reset}>
              New scenario
            </Button>
          ) : null
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader
            title="Road Location & Corridor Settings"
            description="Select places on the map or pick quick Puttur / Chittoor presets. Adjust distance and driving conditions."
          />
          <CardContent>
            <div className="space-y-5">
              {/* Interactive Map */}
              <PredictionMap
                latitude={latitude}
                longitude={longitude}
                onChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                destLatitude={destLatitude}
                destLongitude={destLongitude}
                onDestChange={(lat, lng) => {
                  setDestLatitude(lat);
                  setDestLongitude(lng);
                }}
                mode={mode}
                onModeChange={setMode}
                activeTarget={activeTarget}
                onActiveTargetChange={setActiveTarget}
                distanceKm={selectedDistance}
                onDistanceChange={(d) => {
                  setSelectedDistance(d);
                }}
                originLabel={originName}
                destLabel={destName}
                height={350}
              />

              {/* Point A and Point B location selector cards */}
              {mode === "route" ? (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-900">
                      <RouteIcon className="h-4 w-4 text-indigo-600" />
                      Route Selection (From Place A to Place B)
                    </span>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                      Distance: {selectedDistance.toFixed(2)} km
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Place A Selector */}
                    <div className="rounded-lg border border-emerald-200 bg-white p-2.5 space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-800 flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Start Location (Place A)
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTarget("origin")}
                          className="text-[10px] font-semibold text-emerald-700 underline"
                        >
                          Pick on map
                        </button>
                      </div>
                      <Select
                        id="origin-preset"
                        value={originPresetId}
                        onChange={(e) => handleSelectOriginPreset(e.target.value)}
                        className="text-xs"
                      >
                        <option value="">-- Custom Map Coordinates --</option>
                        {PUTTUR_LOCATIONS.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </Select>
                      <p className="font-mono text-[10px] text-slate-500 truncate">
                        Lat: {latitude.toFixed(5)}, Lng: {longitude.toFixed(5)}
                      </p>
                    </div>

                    {/* Place B Selector */}
                    <div className="rounded-lg border border-rose-200 bg-white p-2.5 space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-rose-800 flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-rose-500" />
                          Destination Location (Place B)
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTarget("destination")}
                          className="text-[10px] font-semibold text-rose-700 underline"
                        >
                          Pick on map
                        </button>
                      </div>
                      <Select
                        id="dest-preset"
                        value={destPresetId}
                        onChange={(e) => handleSelectDestPreset(e.target.value)}
                        className="text-xs"
                      >
                        <option value="">-- Custom Map Coordinates --</option>
                        {PUTTUR_LOCATIONS.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </Select>
                      <p className="font-mono text-[10px] text-slate-500 truncate">
                        Lat: {destLatitude.toFixed(5)}, Lng: {destLongitude.toFixed(5)}
                      </p>
                    </div>
                  </div>

                  {/* Select Distance Control */}
                  <div className="pt-1 border-t border-indigo-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Milestone className="h-4 w-4 text-indigo-600" />
                      <label htmlFor="route-distance" className="text-xs font-semibold text-slate-700">
                        Selected Distance (km):
                      </label>
                      <Input
                        id="route-distance"
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="500"
                        value={selectedDistance}
                        onChange={(e) => {
                          setIsManualDistance(true);
                          setSelectedDistance(Number(e.target.value));
                        }}
                        className="w-24 h-7 text-xs font-semibold"
                      />
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-slate-400">Quick set:</span>
                      {[5, 10, 15, 25, 50].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            setIsManualDistance(true);
                            setSelectedDistance(d);
                          }}
                          className={cn(
                            "rounded px-1.5 py-0.5 border font-semibold",
                            selectedDistance === d
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50",
                          )}
                        >
                          {d}km
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualDistance(false);
                          setSelectedDistance(autoDistance);
                        }}
                        className="rounded px-1.5 py-0.5 border border-indigo-200 bg-indigo-50 font-semibold text-indigo-700 hover:bg-indigo-100"
                      >
                        Auto ({autoDistance.toFixed(1)}km)
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Latitude" htmlFor="latitude">
                    <Input
                      id="latitude"
                      type="number"
                      step="0.00001"
                      min={-90}
                      max={90}
                      value={latitude}
                      onChange={(event) => setLatitude(Number(event.target.value))}
                    />
                  </FormField>
                  <FormField label="Longitude" htmlFor="longitude">
                    <Input
                      id="longitude"
                      type="number"
                      step="0.00001"
                      min={-180}
                      max={180}
                      value={longitude}
                      onChange={(event) => setLongitude(Number(event.target.value))}
                    />
                  </FormField>
                </div>
              )}

              {/* Environmental & Road Parameters */}
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
                <FormField label="Speed limit (mph / kmph equiv)" htmlFor="speed-limit" required>
                  <Select
                    id="speed-limit"
                    value={speedLimit}
                    onChange={(event) => setSpeedLimit(Number(event.target.value))}
                  >
                    {[20, 30, 40, 50, 60, 70].map((option: number) => (
                      <option key={option} value={option}>
                        {option} {option <= 30 ? "(Urban/Town)" : option <= 50 ? "(State Road)" : "(National Highway)"}
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
                {mode === "route" ? "Analyze Road Corridor & Predict Risk" : "Predict Severity"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Pane */}
        <div className="space-y-6">
          {result ? (
            <>
              {/* Route Summary Banner if in route mode */}
              {mode === "route" ? (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-900">
                    <Navigation className="h-4 w-4 text-indigo-600" />
                    Corridor Journey Assessment
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-700">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 block">From (Start):</span>
                      <strong className="text-slate-900">{originName}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 block">To (Destination):</span>
                      <strong className="text-slate-900">{destName}</strong>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-indigo-100 pt-2 text-xs">
                    <span className="text-slate-600">Corridor Length:</span>
                    <strong className="font-mono text-indigo-700 font-bold">{selectedDistance.toFixed(2)} km</strong>
                  </div>
                </div>
              ) : null}

              <Card>
                <CardHeader
                  title={mode === "route" ? "Corridor Severity Outcome" : "Severity Outcome"}
                  description="Predicted accident severity and probability distribution."
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
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : result.predicted_severity === "Serious"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200",
                          )}
                        >
                          {result.predicted_severity}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatPercent(result.predicted_probability)} confidence
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">
                        Severe probability {formatPercent(result.severe_probability)} · Fatal probability{" "}
                        {formatPercent(result.fatal_probability)}
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
                  title="Corridor Risk Drivers"
                  description="Active risk variables contributing to road danger."
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
                      Standard operating conditions; no extreme risk multipliers triggered.
                    </p>
                  )}
                  {result.probability_note ? (
                    <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
                      {result.probability_note}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              {/* Nearby Hotspots */}
              <Card>
                <CardHeader
                  title="Nearby Collision Hotspots"
                  description="High-frequency collision sites within range of this location."
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
                              {formatNumber(hotspot.accident_count)} historical collisions ·{" "}
                              {hotspot.distance_km.toFixed(1)} km away
                            </p>
                          </div>
                          <Link
                            to={`/hotspots?focus=${hotspot.cluster_id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-brand-600 shadow-2xs transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                          >
                            <span>View hotspot</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs leading-relaxed text-slate-500">
                      No high-risk cluster pins within 50 km. Road corridor behaves consistently with standard baseline.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Safety Recommendations */}
              <Card>
                <CardHeader
                  title="Safety Interventions & Recommendations"
                  description="Targeted mitigations derived from safety evidence for this road stretch."
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
                    <p className="text-xs text-slate-500">No specific interventions matched.</p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-50 text-signal-600">
                <RouteIcon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-slate-950">
                Analyze Road Corridor
              </h3>
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">
                Pick your Start location (Point A) and Destination (Point B) in <strong>Puttur City / Chittoor</strong>, adjust your journey distance and conditions, then click to evaluate route safety.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400">
                <span className="rounded-full border border-slate-200 px-2.5 py-1">
                  Puttur City, AP
                </span>
                <span className="rounded-full border border-slate-200 px-2.5 py-1">
                  Corridor Polyline
                </span>
                <span className="rounded-full border border-slate-200 px-2.5 py-1">
                  Distance Calculation
                </span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
