import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { Hotspot } from "@/types";
import { UK_CENTER } from "@/lib/constants";
import { cn, formatNumber, formatPercent, riskTone } from "@/lib/utils";

interface HotspotMapProps {
  clusters: Hotspot[];
  selectedKey?: string | null;
  onSelect?: (cluster: Hotspot) => void;
  height?: number;
  center?: [number, number];
  zoom?: number;
  className?: string;
}

function markerColor(riskScore: number): string {
  if (riskScore >= 60) return "#ef4444";
  if (riskScore >= 40) return "#f59e0b";
  if (riskScore >= 20) return "#0ea5e9";
  return "#10b981";
}

function markerRadius(accidentCount: number): number {
  return Math.max(5, Math.min(22, 3 + Math.log10(accidentCount + 1) * 6));
}

function MapFocus({ cluster }: { cluster: Hotspot | null }) {
  const map = useMap();
  useEffect(() => {
    if (!cluster) return;
    map.flyTo([cluster.latitude, cluster.longitude], Math.max(map.getZoom(), 8), {
      duration: 0.7,
    });
  }, [cluster, map]);
  return null;
}

export function HotspotMap({
  clusters,
  selectedKey,
  onSelect,
  height = 480,
  center = UK_CENTER,
  zoom = 6,
  className,
}: HotspotMapProps) {
  const selected =
    clusters.find(
      (cluster) => `${cluster.algorithm}-${cluster.cluster_id}` === selectedKey,
    ) || null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100",
        className,
      )}
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {clusters.map((cluster) => {
          const key = `${cluster.algorithm}-${cluster.cluster_id}`;
          const active = selectedKey === key;
          const color = markerColor(cluster.risk_score);
          return (
            <CircleMarker
              key={key}
              center={[cluster.latitude, cluster.longitude]}
              radius={markerRadius(cluster.accident_count)}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: active ? 0.55 : 0.28,
                weight: active ? 3 : 1.5,
              }}
              eventHandlers={{
                click: () => onSelect?.(cluster),
              }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={1}>
                <div className="text-xs">
                  <p className="font-semibold">{cluster.label}</p>
                  <p>{formatNumber(cluster.accident_count)} collisions</p>
                  <p>Risk {cluster.risk_score.toFixed(1)}</p>
                </div>
              </Tooltip>
              <Popup>
                <div className="min-w-44 text-xs">
                  <p className="text-sm font-semibold text-slate-900">
                    {cluster.label}
                  </p>
                  <div className="mt-2 space-y-1 text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-900">
                        {formatNumber(cluster.accident_count)}
                      </span>{" "}
                      collisions
                    </p>
                    <p>
                      Severe rate{" "}
                      <span className="font-semibold text-slate-900">
                        {formatPercent(cluster.severity_rate)}
                      </span>
                    </p>
                    <p>
                      Fatal {formatNumber(cluster.fatal_count)} · Serious{" "}
                      {formatNumber(cluster.serious_count)}
                    </p>
                    <p>
                      Radius {cluster.radius_km.toFixed(1)} km
                    </p>
                  </div>
                  <p
                    className={cn(
                      "mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      riskTone(cluster.risk_score).bg,
                      riskTone(cluster.risk_score).text,
                    )}
                  >
                    Risk {cluster.risk_score.toFixed(1)} ·{" "}
                    {riskTone(cluster.risk_score).label}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        <MapFocus cluster={selected} />
      </MapContainer>

      <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-card backdrop-blur">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
          Risk score
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          {[
            { label: "Low", color: "#10b981" },
            { label: "Moderate", color: "#0ea5e9" },
            { label: "High", color: "#f59e0b" },
            { label: "Very high", color: "#ef4444" },
          ].map((item) => (
            <span key={item.label} className="flex items-center gap-1 text-[9px] text-slate-500">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
