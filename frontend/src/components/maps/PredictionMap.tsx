import { useEffect, useMemo } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { MapPin, Navigation, Route as RouteIcon, LocateFixed } from "lucide-react";
import { PUTTUR_CHITTOOR_CENTER, PUTTUR_LOCATIONS, type LocationPreset } from "@/lib/constants";
import { calculateDistanceKm, cn, formatNumber } from "@/lib/utils";

export interface MapBounds {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
}

interface PredictionMapProps {
  latitude: number;
  longitude: number;
  onChange: (latitude: number, longitude: number) => void;
  // Route / Corridor props
  destLatitude?: number;
  destLongitude?: number;
  onDestChange?: (latitude: number, longitude: number) => void;
  mode?: "single" | "route";
  onModeChange?: (mode: "single" | "route") => void;
  activeTarget?: "origin" | "destination";
  onActiveTargetChange?: (target: "origin" | "destination") => void;
  distanceKm?: number;
  onDistanceChange?: (dist: number) => void;
  height?: number;
  bounds?: MapBounds;
  originLabel?: string;
  destLabel?: string;
}

export function clampCoordinate(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function MapClickHandler({
  onClick,
}: {
  onClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      const lat = Number(event.latlng.lat.toFixed(5));
      const lng = Number(event.latlng.lng.toFixed(5));
      onClick(lat, lng);
    },
  });
  return null;
}

function MapController({
  center,
  zoom,
}: {
  center: [number, number];
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom ?? map.getZoom(), { duration: 0.8 });
  }, [center[0], center[1], zoom, map]);
  return null;
}

export function PredictionMap({
  latitude,
  longitude,
  onChange,
  destLatitude = 13.4750,
  destLongitude = 79.5420,
  onDestChange,
  mode = "route",
  onModeChange,
  activeTarget = "origin",
  onActiveTargetChange,
  distanceKm,
  onDistanceChange,
  height = 380,
  originLabel = "Start (Puttur Town)",
  destLabel = "Destination (Tirupati NH 716)",
}: PredictionMapProps) {
  const calculatedDist = useMemo(() => {
    return calculateDistanceKm(latitude, longitude, destLatitude, destLongitude);
  }, [latitude, longitude, destLatitude, destLongitude]);

  useEffect(() => {
    if (onDistanceChange && (distanceKm === undefined || distanceKm <= 0)) {
      onDistanceChange(calculatedDist);
    }
  }, [calculatedDist, distanceKm, onDistanceChange]);

  const midpoint: [number, number] = useMemo(() => {
    return [(latitude + destLatitude) / 2, (longitude + destLongitude) / 2];
  }, [latitude, destLatitude, longitude, destLongitude]);

  const handleMapClick = (lat: number, lng: number) => {
    if (mode === "single") {
      onChange(lat, lng);
      return;
    }

    if (activeTarget === "origin") {
      onChange(lat, lng);
      if (onActiveTargetChange) onActiveTargetChange("destination");
    } else {
      if (onDestChange) onDestChange(lat, lng);
      if (onActiveTargetChange) onActiveTargetChange("origin");
    }
  };

  const handleApplyPreset = (preset: LocationPreset) => {
    if (mode === "single" || activeTarget === "origin") {
      onChange(preset.latitude, preset.longitude);
      if (mode === "route" && onActiveTargetChange) {
        onActiveTargetChange("destination");
      }
    } else if (onDestChange) {
      onDestChange(preset.latitude, preset.longitude);
      if (onActiveTargetChange) {
        onActiveTargetChange("origin");
      }
    }
  };

  const currentDisplayDistance = distanceKm && distanceKm > 0 ? distanceKm : calculatedDist;

  return (
    <div className="space-y-3">
      {/* Top Map Header: Location Presets & Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-ink-800">
          <MapPin className="h-3.5 w-3.5 text-brand-600" />
          <span>Andhra Pradesh · Chittoor District · <strong className="font-semibold text-brand-700">Puttur City</strong></span>
        </div>

        {onModeChange ? (
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => onModeChange("route")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                mode === "route"
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              <RouteIcon className="h-3.5 w-3.5" />
              Road Route (Place A → B)
            </button>
            <button
              type="button"
              onClick={() => onModeChange("single")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all",
                mode === "single"
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              <LocateFixed className="h-3.5 w-3.5" />
              Single Spot
            </button>
          </div>
        ) : null}
      </div>

      {/* Quick Location Presets Toolbar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
        <span className="shrink-0 font-medium text-slate-500">Quick select:</span>
        {PUTTUR_LOCATIONS.map((loc) => (
          <button
            key={loc.id}
            type="button"
            onClick={() => handleApplyPreset(loc)}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700 hover:border-brand-300 hover:bg-brand-50/50 hover:text-brand-700 transition"
          >
            {loc.shortName}
          </button>
        ))}
      </div>

      {/* The Leaflet Map Container */}
      <div
        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm"
        style={{ height }}
      >
        <MapContainer
          center={PUTTUR_CHITTOOR_CENTER}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom
          className="z-0 cursor-crosshair"
          minZoom={4}
          maxZoom={18}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {mode === "route" ? (
            <>
              {/* Route line connecting Point A to Point B */}
              <Polyline
                positions={[
                  [latitude, longitude],
                  [destLatitude, destLongitude],
                ]}
                pathOptions={{
                  color: "#4f46e5",
                  weight: 4,
                  dashArray: "6, 6",
                  opacity: 0.85,
                }}
              />

              {/* Corridor buffer circle around midpoint */}
              <Circle
                center={midpoint}
                radius={Math.min(currentDisplayDistance * 500, 15000)}
                pathOptions={{
                  color: "#6366f1",
                  fillColor: "#6366f1",
                  fillOpacity: 0.05,
                  weight: 1,
                  dashArray: "4 4",
                }}
              />

              {/* Point A (Start / Origin) Marker */}
              <CircleMarker
                center={[latitude, longitude]}
                radius={10}
                pathOptions={{
                  color: "#ffffff",
                  fillColor: "#10b981",
                  fillOpacity: 1,
                  weight: 3,
                }}
              >
                <Tooltip direction="top" offset={[0, -6]} permanent opacity={0.95}>
                  <span className="font-semibold text-emerald-900">A: Start ({originLabel})</span>
                </Tooltip>
              </CircleMarker>

              {/* Point B (Destination / End) Marker */}
              <CircleMarker
                center={[destLatitude, destLongitude]}
                radius={10}
                pathOptions={{
                  color: "#ffffff",
                  fillColor: "#ef4444",
                  fillOpacity: 1,
                  weight: 3,
                }}
              >
                <Tooltip direction="top" offset={[0, -6]} permanent opacity={0.95}>
                  <span className="font-semibold text-rose-900">B: Destination ({destLabel})</span>
                </Tooltip>
              </CircleMarker>
            </>
          ) : (
            <>
              {/* Single Spot Marker */}
              <Circle
                center={[latitude, longitude]}
                radius={3000}
                pathOptions={{
                  color: "#ff7f11",
                  fillColor: "#ff7f11",
                  fillOpacity: 0.08,
                  weight: 1,
                  dashArray: "4 4",
                }}
              />
              <CircleMarker
                center={[latitude, longitude]}
                radius={9}
                pathOptions={{
                  color: "#ffffff",
                  fillColor: "#ff7f11",
                  fillOpacity: 1,
                  weight: 3,
                }}
              />
            </>
          )}

          <MapClickHandler onClick={handleMapClick} />
        </MapContainer>

        {/* Floating Controls Overlay */}
        {mode === "route" ? (
          <div className="absolute top-3 left-3 z-[400] flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onActiveTargetChange?.("origin")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold backdrop-blur shadow-sm transition",
                activeTarget === "origin"
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-slate-300 bg-white/90 text-slate-700 hover:bg-white",
              )}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Pin A: Start Location
            </button>
            <button
              type="button"
              onClick={() => onActiveTargetChange?.("destination")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold backdrop-blur shadow-sm transition",
                activeTarget === "destination"
                  ? "border-rose-600 bg-rose-600 text-white"
                  : "border-slate-300 bg-white/90 text-slate-700 hover:bg-white",
              )}
            >
              <span className="h-2 w-2 rounded-full bg-rose-300" />
              Pin B: Destination Location
            </button>
          </div>
        ) : null}

        {/* Distance & Info Badge (Bottom Left) */}
        <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-card backdrop-blur">
          {mode === "route" ? (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Route Distance:
                </span>
                <span className="font-mono text-xs font-bold text-indigo-700">
                  {currentDisplayDistance.toFixed(2)} km
                </span>
              </div>
              <p className="font-mono text-[10px] text-slate-600">
                A ({latitude.toFixed(4)}, {longitude.toFixed(4)}) → B ({destLatitude.toFixed(4)}, {destLongitude.toFixed(4)})
              </p>
            </div>
          ) : (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                Selected location
              </p>
              <p className="mt-0.5 font-mono text-[11px] font-semibold text-slate-800">
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </p>
            </div>
          )}
        </div>

        {/* Map Instructions Badge (Top Right) */}
        <div className="pointer-events-none absolute right-3 top-3 z-[400] rounded-lg bg-ink-950/80 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur">
          {mode === "route"
            ? `Click map to place ${activeTarget === "origin" ? "Start (Point A)" : "Destination (Point B)"}`
            : "Click map to move pin"}
        </div>
      </div>
    </div>
  );
}

export function formatCoordinates(latitude: number, longitude: number): string {
  return `${formatNumber(latitude)}, ${formatNumber(longitude)}`;
}
