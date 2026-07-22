import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TBILISI_CENTER } from "@/lib/mock-data";
import MapLayerSelector, { type MapLayerId } from "@/components/map/MapLayerSelector";

// Fix default marker icons (Leaflet needs explicit URLs when bundled).
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Props {
  value: { lat: number | null; lng: number | null };
  onChange: (v: { lat: number; lng: number }) => void;
  height?: number;
  /** Draws a semi-transparent radius preview circle around the marker (km). */
  radiusKm?: number;
  /** localStorage key namespace for persisting the layer choice. */
  storageKey?: string;
}

function ClickHandler({ onChange }: { onChange: Props["onChange"] }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  const prev = useRef<string>("");
  useEffect(() => {
    if (lat == null || lng == null) return;
    const key = `${lat},${lng}`;
    if (prev.current === key) return;
    prev.current = key;
    map.panTo([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

function readStoredLayer(key: string): MapLayerId {
  if (typeof window === "undefined") return "standard";
  const v = window.localStorage.getItem(`${key}:layer`);
  if (v === "standard" || v === "satellite" || v === "hybrid") return v;
  return "standard";
}

export function StoreLocationPicker({
  value,
  onChange,
  height = 320,
  radiusKm,
  storageKey = "cheaper-picker-map",
}: Props) {
  const center = useMemo<[number, number]>(() => {
    if (value.lat != null && value.lng != null) return [value.lat, value.lng];
    return TBILISI_CENTER;
  }, [value.lat, value.lng]);

  const hasMarker = value.lat != null && value.lng != null;
  const [layer, setLayer] = useState<MapLayerId>(() => readStoredLayer(storageKey));

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`${storageKey}:layer`, layer);
  }, [layer, storageKey]);

  return (
    <div
      className="w-full rounded-2xl overflow-hidden border border-border relative"
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        {layer === "standard" && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}
        {(layer === "satellite" || layer === "hybrid") && (
          <TileLayer
            attribution="Tiles &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        )}
        {layer === "hybrid" && (
          <TileLayer
            attribution="Labels &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            opacity={0.9}
            maxZoom={19}
          />
        )}
        <ClickHandler onChange={onChange} />
        <Recenter lat={value.lat} lng={value.lng} />
        {hasMarker && radiusKm && radiusKm > 0 && (
          <Circle
            center={[value.lat!, value.lng!]}
            radius={radiusKm * 1000}
            interactive={false}
            pathOptions={{
              color: "hsl(142 71% 45%)",
              weight: 1.5,
              opacity: 0.7,
              fillColor: "hsl(142 71% 45%)",
              fillOpacity: 0.12,
            }}
          />
        )}
        {hasMarker && (
          <Marker
            position={[value.lat!, value.lng!]}
            icon={markerIcon}
            draggable
            eventHandlers={{
              dragend(e) {
                const m = e.target as L.Marker;
                const p = m.getLatLng();
                onChange({ lat: p.lat, lng: p.lng });
              },
            }}
          />
        )}
      </MapContainer>
      <div className="absolute top-2 right-2 z-[500]">
        <MapLayerSelector value={layer} onChange={setLayer} />
      </div>
    </div>
  );
}

export default StoreLocationPicker;
