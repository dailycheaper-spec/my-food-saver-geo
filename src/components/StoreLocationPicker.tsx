import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TBILISI_CENTER } from "@/lib/mock-data";

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

export function StoreLocationPicker({ value, onChange, height = 320 }: Props) {
  const center = useMemo<[number, number]>(() => {
    if (value.lat != null && value.lng != null) return [value.lat, value.lng];
    return TBILISI_CENTER;
  }, [value.lat, value.lng]);

  const hasMarker = value.lat != null && value.lng != null;

  return (
    <div
      className="w-full rounded-2xl overflow-hidden border border-border"
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        <Recenter lat={value.lat} lng={value.lng} />
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
    </div>
  );
}

export default StoreLocationPicker;
