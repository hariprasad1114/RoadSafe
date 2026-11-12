import { Circle, CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { formatNumber } from "@/lib/utils";

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
  height?: number;
  bounds?: MapBounds;
}

export function clampCoordinate(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function MapClickHandler({
  onChange,
  bounds,
}: {
  onChange: (latitude: number, longitude: number) => void;
  bounds?: MapBounds;
}) {
  useMapEvents({
    click(event) {
      let latitude = Number(event.latlng.lat.toFixed(5));
      let longitude = Number(event.latlng.lng.toFixed(5));
      if (bounds) {
        latitude = Number(
          clampCoordinate(latitude, bounds.minLatitude, bounds.maxLatitude).toFixed(5),
        );
        longitude = Number(
          clampCoordinate(longitude, bounds.minLongitude, bounds.maxLongitude).toFixed(5),
        );
      }
      onChange(latitude, longitude);
    },
  });
  return null;
}

export function PredictionMap({
  latitude,
  longitude,
  onChange,
  height = 340,
  bounds,
}: PredictionMapProps) {
  const safeLatitude = bounds
    ? clampCoordinate(latitude, bounds.minLatitude, bounds.maxLatitude)
    : latitude;
  const safeLongitude = bounds
    ? clampCoordinate(longitude, bounds.minLongitude, bounds.maxLongitude)
    : longitude;
  const maxBounds: [[number, number], [number, number]] | undefined = bounds
    ? [
        [bounds.minLatitude, bounds.minLongitude],
        [bounds.maxLatitude, bounds.maxLongitude],
      ]
    : undefined;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
      style={{ height }}
    >
      <MapContainer
        center={[safeLatitude, safeLongitude]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        className="z-0 cursor-crosshair"
        maxBounds={maxBounds}
        maxBoundsViscosity={1.0}
        minZoom={5}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={[safeLatitude, safeLongitude]}
          radius={5000}
          pathOptions={{
            color: "#ff7f11",
            fillColor: "#ff7f11",
            fillOpacity: 0.08,
            weight: 1,
            dashArray: "4 4",
          }}
        />
        <CircleMarker
          center={[safeLatitude, safeLongitude]}
          radius={9}
          pathOptions={{
            color: "#ffffff",
            fillColor: "#ff7f11",
            fillOpacity: 1,
            weight: 3,
          }}
        />
        <MapClickHandler onChange={onChange} bounds={bounds} />
      </MapContainer>
      <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-card backdrop-blur">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
          Selected location
        </p>
        <p className="mt-1 font-mono text-[11px] font-semibold text-slate-800">
          {safeLatitude.toFixed(5)}, {safeLongitude.toFixed(5)}
        </p>
      </div>
      <div className="pointer-events-none absolute right-3 top-3 z-[400] rounded-lg bg-ink-950/80 px-2 py-1 text-[9px] font-medium text-white backdrop-blur">
        Click map to move pin
      </div>
    </div>
  );
}

export function formatCoordinates(latitude: number, longitude: number): string {
  return `${formatNumber(latitude)}, ${formatNumber(longitude)}`;
}
