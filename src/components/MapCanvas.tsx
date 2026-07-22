import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { MapContainer, TileLayer, ZoomControl, useMap, useMapEvents, LayersControl } from "react-leaflet";
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

export default function MapCanvas({
  center,
  userPos,
  userAccuracy,
  stores,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: Props) {
  const [layer, setLayer] = useState<MapLayerId>("standard");
  const [zoom, setZoom] = useState(12);
  const compact = zoom < 13;

  return (
    <MapContainer
      center={center}
      zoom={12}
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
