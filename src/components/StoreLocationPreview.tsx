import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { evaluateStoreLocation } from "@/lib/geo";
import { useI18n } from "@/lib/i18n";

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
  lat: number | null | undefined;
  lng: number | null | undefined;
  height?: number;
}

/** Read-only location preview. Uses our own Leaflet map (not OSM's export
 * iframe) so zoom in/out both work reliably and there's no third-party
 * OSM branding/donation link inside internal admin UI. */
export function StoreLocationPreview({ lat, lng, height = 140 }: Props) {
  const { t } = useI18n();
  const status = evaluateStoreLocation(lat, lng);
  if (status !== "ok" || lat == null || lng == null) {
    return (
      <div
        className="rounded-2xl bg-muted/40 border border-dashed border-border grid place-items-center text-xs text-muted-foreground"
        style={{ height }}
      >
        {status === "invalid" ? t("map.coordsInvalid") : t("map.locationMissing")}
      </div>
    );
  }
  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-muted" style={{ height }}>
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={markerIcon} />
      </MapContainer>
    </div>
  );
}

export default StoreLocationPreview;
