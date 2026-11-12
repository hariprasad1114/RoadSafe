import { Circle, CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { formatNumber } from "@/lib/utils";

interface PredictionMapProps {
  latitude: number;
  longitude: number;
  onChange: (latitude: number, longitude: number) => void;
  height?: number;
}

function MapClickHandler({
  onChange,
}: {
  onChange: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onChange(
        Number(event.latlng.lat.toFixed(5)),
        Number(event.latlng.lng.toFixed(5)),
      );
    },
  });
  return null;
}

export function PredictionMap({
  latitude,
  longitude,
  onChange,
  height = 340,
}: PredictionMapProps) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
      style={{ height }}
    >
      <MapContainer
        center={[latitude, longitude]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        className="z-0 cursor-crosshair"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={[latitude, longitude]}
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
          center={[latitude, longitude]}
          radius={9}
          pathOptions={{
            color: "#ffffff",
            fillColor: "#ff7f11",
            fillOpacity: 1,
            weight: 3,
          }}
        />
        <MapClickHandler onChange={onChange} />
      </MapContainer>
      <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-card backdrop-blur">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
          Selected location
        </p>
        <p className="mt-1 font-mono text-[11px] font-semibold text-slate-800">
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
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
