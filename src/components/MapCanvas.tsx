import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { MapContainer, TileLayer, ZoomControl, useMap, useMapEvents, LayersControl, Circle, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapStore } from "@/routes/map";
import StoreMarker from "./map/StoreMarker";
import UserLocationMarker from "./map/UserLocationMarker";
import MapLayerSelector, { type MapLayerId } from "./map/MapLayerSelector";

const ClusterLayer = lazy(() => import("./map/ClusterLayer"));

function RecenterOn({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo(pos, Math.max(map.getZoom(), 14));
  }, [pos, map]);
  return null;
}

function ZoomWatcher({ onChange }: { onChange: (z: number) => void }) {
  const map = useMap();
  useEffect(() => {
    onChange(map.getZoom());
  }, [map, onChange]);
  useMapEvents({
    zoomend: (e) => onChange(e.target.getZoom()),
  });
  return null;
}

interface Props {
  center: [number, number];
  userPos: [number, number] | null;
  userAccuracy?: number;
  stores: MapStore[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  /** Semi-transparent search radius circle around the user, in km. */
  searchRadiusKm?: number;
  /** localStorage key namespace for persisting layer + zoom. */
  storageKey?: string;
}

function StandardTiles() {
  return (
    <TileLayer
      attribution='&copy; OpenStreetMap'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
  );
}

function SatelliteTiles() {
  return (
    <TileLayer
      attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics"
      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      maxZoom={19}
    />
  );
}

function HybridReferenceOverlay() {
  return (
    <TileLayer
      attribution="Labels &copy; Esri"
      url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
      opacity={0.9}
      maxZoom={19}
    />
  );
}

function readStoredLayer(key: string): MapLayerId {
  if (typeof window === "undefined") return "standard";
  const v = window.localStorage.getItem(`${key}:layer`);
  if (v === "standard" || v === "satellite" || v === "hybrid") return v;
  return "standard";
}
function readStoredZoom(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(`${key}:zoom`);
  const n = raw != null ? Number(raw) : NaN;
  return Number.isFinite(n) && n >= 3 && n <= 20 ? n : fallback;
}

export default function MapCanvas({
  center,
  userPos,
  userAccuracy,
  stores,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  searchRadiusKm,
  storageKey = "cheaper-customer-map",
}: Props) {
  const [layer, setLayer] = useState<MapLayerId>(() => readStoredLayer(storageKey));
  const initialZoom = useMemo(() => readStoredZoom(storageKey, 12), [storageKey]);
  const [zoom, setZoom] = useState(initialZoom);
  const compact = zoom < 13;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`${storageKey}:layer`, layer);
  }, [layer, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`${storageKey}:zoom`, String(zoom));
  }, [zoom, storageKey]);

  const selectedStore = useMemo(
    () => stores.find((s) => s.storeId === selectedId) ?? null,
    [stores, selectedId],
  );

  return (
    <MapContainer
      center={center}
      zoom={initialZoom}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
      style={{ height: "100%", width: "100%" }}
    >
      <ZoomWatcher onChange={setZoom} />
      {layer === "standard" && <StandardTiles />}
      {(layer === "satellite" || layer === "hybrid") && <SatelliteTiles />}
      {layer === "hybrid" && <HybridReferenceOverlay />}
      <ZoomControl position="bottomright" />
      <RecenterOn pos={userPos} />

      <div className="leaflet-top leaflet-right" style={{ pointerEvents: "none" }}>
        <div className="leaflet-control" style={{ marginTop: 60, marginRight: 12 }}>
          <MapLayerSelector value={layer} onChange={setLayer} />
        </div>
      </div>

      {userPos && searchRadiusKm && searchRadiusKm > 0 && (
        <Circle
          center={userPos}
          radius={searchRadiusKm * 1000}
          interactive={false}
          pathOptions={{
            color: "hsl(var(--primary))",
            weight: 1.5,
            opacity: 0.55,
            fillColor: "hsl(var(--primary))",
            fillOpacity: 0.06,
            dashArray: "4 6",
          }}
        />
      )}

      {userPos && selectedStore && (
        <Polyline
          positions={[userPos, [selectedStore.lat, selectedStore.lng]]}
          interactive={false}
          pathOptions={{
            color: "hsl(var(--primary))",
            weight: 2,
            opacity: 0.75,
            dashArray: "6 8",
          }}
        />
      )}

      {userPos && (
        <UserLocationMarker lat={userPos[0]} lng={userPos[1]} accuracy={userAccuracy} />
      )}

      <Suspense fallback={null}>
        <ClusterLayer>
          {stores.map((s) => (
            <StoreMarker
              key={s.storeId}
              store={s}
              selected={selectedId === s.storeId}
              hovered={hoveredId === s.storeId}
              compact={compact}
              onSelect={onSelect}
              onHover={onHover}
            />
          ))}
        </ClusterLayer>
      </Suspense>
    </MapContainer>
  );
}

// Ensure LayersControl import is used to avoid unused-import stripping issues in some setups
void LayersControl;
void L;
