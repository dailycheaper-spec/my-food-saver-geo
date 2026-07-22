import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapOffer } from "@/routes/map";
import { getStoreName, getOfferText, type Language } from "@/lib/mock-data";

function hashOffset(id: string): [number, number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const dx = ((h & 0xff) / 255 - 0.5) * 0.0016;
  const dy = (((h >> 8) & 0xff) / 255 - 0.5) * 0.0016;
  return [dx, dy];
}

function priceIcon(o: MapOffer, selected: boolean, hovered: boolean, name: string) {
  const discount = o.originalPrice > 0 ? Math.round((1 - o.price / o.originalPrice) * 100) : 0;
  const active = selected || hovered;
  const state = o._state;
  const borderColor =
    state === "unavailable" ? "hsl(var(--muted-foreground))" :
    state === "almost" ? "#f59e0b" :
    "hsl(var(--primary))";
  const bg = state === "unavailable"
    ? "hsl(var(--muted))"
    : active ? "hsl(var(--primary))" : "hsl(var(--card))";
  const fg = state === "unavailable"
    ? "hsl(var(--muted-foreground))"
    : active ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))";
  const logo = (o.storeLogo ?? "").toString();
  const isUrl = /^(https?:|\/|data:)/.test(logo);
  const size = hovered ? 32 : 22;
  const fontSize = hovered ? 14 : 12;
  const logoHtml = isUrl
    ? `<img src="${logo}" alt="" style="width:${size}px;height:${size}px;border-radius:9999px;object-fit:cover;background:hsl(var(--card))" />`
    : `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:hsl(var(--card));display:grid;place-items:center;font-size:${hovered ? 18 : 14}px;line-height:1">${logo || "🏪"}</div>`;
  const stateBadge =
    state === "almost"
      ? `<div style="position:absolute;top:-8px;left:-8px;background:#f59e0b;color:#fff;font-size:9px;font-weight:800;padding:2px 5px;border-radius:9999px;border:2px solid hsl(var(--card));line-height:1">⏳</div>`
      : state === "unavailable"
      ? `<div style="position:absolute;top:-8px;left:-8px;background:hsl(var(--muted-foreground));color:#fff;font-size:9px;font-weight:800;padding:2px 5px;border-radius:9999px;border:2px solid hsl(var(--card));line-height:1">✕</div>`
      : "";
  const badge = discount > 0 && state !== "unavailable"
    ? `<div style="position:absolute;top:-8px;right:-10px;background:hsl(var(--primary));color:hsl(var(--primary-foreground));font-size:10px;font-weight:800;padding:2px 6px;border-radius:9999px;border:2px solid hsl(var(--card));white-space:nowrap;line-height:1">-${discount}%</div>`
    : "";
  const nameHtml = hovered
    ? `<span style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700;font-size:${fontSize}px">${name}</span><span style="opacity:.6">·</span>`
    : "";
  const priceHtml = state === "unavailable" ? "—" : `${o.price.toFixed(0)}₾`;
  const html = `<div style="position:relative;transform:translate(-50%,-100%);white-space:nowrap;border:2px solid ${borderColor};background:${bg};color:${fg};padding:3px 12px 3px 3px;border-radius:9999px;font-weight:800;font-size:${fontSize}px;box-shadow:0 6px 16px rgba(0,0,0,.22);line-height:1;display:inline-flex;align-items:center;gap:6px;transition:all .15s">${logoHtml}${nameHtml}<span>${priceHtml}</span>${badge}${stateBadge}</div>`;
  return L.divIcon({ html, className: "", iconSize: [0, 0] });
}

function RecenterOn({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.flyTo(pos, Math.max(map.getZoom(), 14));
  }, [pos, map]);
  return null;
}

interface Props {
  center: [number, number];
  userPos: [number, number] | null;
  offers: MapOffer[];
  language: Language;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

export default function MapCanvas({ center, userPos, offers, language, selectedId, hoveredId, onSelect, onHover }: Props) {
  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
      style={{ height: "100%", width: "100%" }}
    >
      <ZoomControl position="bottomright" />
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterOn pos={userPos} />
      {userPos && (
        <Marker
          position={userPos}
          icon={L.divIcon({
            html: `<div style="transform:translate(-50%,-50%);width:16px;height:16px;border-radius:9999px;background:hsl(var(--primary));box-shadow:0 0 0 6px hsl(var(--primary)/.25)"></div>`,
            className: "",
            iconSize: [0, 0],
          })}
        />
      )}
      {offers.map((o) => {
        const [dx, dy] = hashOffset(o.id);
        const isHovered = hoveredId === o.id;
        const isSelected = selectedId === o.id;
        return (
          <Marker
            key={o.id}
            position={[o.lat + dx, o.lng + dy]}
            icon={priceIcon(o, isSelected, isHovered, getStoreName(o, language))}
            zIndexOffset={isHovered ? 2000 : isSelected ? 1000 : 0}
            eventHandlers={{
              click: () => onSelect(o.id),
              mouseover: () => onHover(o.id),
              mouseout: () => onHover(null),
            }}
          >
            <Popup>
              <div className="text-xs font-semibold">{getStoreName(o, language)}</div>
              <div className="text-xs">{getOfferText(o, language).title}</div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
