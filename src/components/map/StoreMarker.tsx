import { Marker } from "react-leaflet";
import L from "leaflet";
import { useMemo } from "react";
import type { MapStore } from "@/routes/map";

interface Props {
  store: MapStore;
  selected: boolean;
  hovered: boolean;
  compact: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

function buildIcon(s: MapStore, selected: boolean, hovered: boolean, compact: boolean): L.DivIcon {
  const active = selected || hovered;
  const allUnavailable = s.activeCount === 0;
  const hasAlmost = s.hasAlmost;
  const borderColor = allUnavailable
    ? "hsl(var(--muted-foreground))"
    : hasAlmost
    ? "#f59e0b"
    : "hsl(var(--primary))";
  const bg = allUnavailable
    ? "hsl(var(--muted))"
    : active
    ? "hsl(var(--primary))"
    : "hsl(var(--card))";
  const fg = allUnavailable
    ? "hsl(var(--muted-foreground))"
    : active
    ? "hsl(var(--primary-foreground))"
    : "hsl(var(--foreground))";
  const priceHtml = allUnavailable ? "—" : `${s.minPrice.toFixed(0)}₾-დან`;

  // Compact view: small price/discount pill only
  if (compact && !hovered && !selected) {
    const html = `<div class="store-marker-in store-marker-compact" style="position:relative;transform:translate(-50%,-100%);border:2px solid ${borderColor};background:${bg};color:${fg};padding:2px 8px;border-radius:9999px;font-weight:800;font-size:11px;box-shadow:0 4px 10px rgba(0,0,0,.2);line-height:1;white-space:nowrap;transition:transform .2s cubic-bezier(.22,1,.36,1),box-shadow .2s ease">${priceHtml}${
      s.activeCount > 1
        ? `<span style="margin-left:4px;opacity:.75;font-size:9px">×${s.activeCount}</span>`
        : ""
    }${hasAlmost ? `<span style="margin-left:4px">⏳</span>` : ""}${
      allUnavailable ? `<span style="margin-left:4px">✕</span>` : ""
    }</div>
    <style>.store-marker-in{animation:markerIn .22s cubic-bezier(.22,1,.36,1) both}.store-marker-compact:hover{transform:translate(-50%,-100%) scale(1.08);box-shadow:0 8px 18px rgba(0,0,0,.28)}@keyframes markerIn{from{opacity:0;transform:translate(-50%,-100%) scale(.85)}to{opacity:1;transform:translate(-50%,-100%) scale(1)}}</style>`;
    return L.divIcon({ html, className: "", iconSize: [0, 0] });
  }

  const logo = (s.storeLogo ?? "").toString();
  const isUrl = /^(https?:|\/|data:)/.test(logo);
  const size = hovered ? 32 : 24;
  const fontSize = hovered ? 14 : 12;
  const logoHtml = isUrl
    ? `<img src="${logo}" alt="" style="width:${size}px;height:${size}px;border-radius:9999px;object-fit:cover;background:hsl(var(--card));transition:width .2s ease,height .2s ease" />`
    : `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:hsl(var(--card));display:grid;place-items:center;font-size:${
        hovered ? 18 : 14
      }px;line-height:1;transition:all .2s ease">${logo || "🏪"}</div>`;
  const nameHtml = hovered
    ? `<span style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700;font-size:${fontSize}px">${s.storeName}</span><span style="opacity:.6">·</span>`
    : "";
  const countBadge =
    s.activeCount > 1
      ? `<div style="position:absolute;top:-8px;right:-10px;background:hsl(var(--primary));color:hsl(var(--primary-foreground));font-size:10px;font-weight:800;padding:2px 6px;border-radius:9999px;border:2px solid hsl(var(--card));white-space:nowrap;line-height:1">×${s.activeCount}</div>`
      : "";
  const stateBadge = allUnavailable
    ? `<div style="position:absolute;top:-8px;left:-8px;background:hsl(var(--muted-foreground));color:#fff;font-size:9px;font-weight:800;padding:2px 5px;border-radius:9999px;border:2px solid hsl(var(--card));line-height:1">✕</div>`
    : hasAlmost
    ? `<div style="position:absolute;top:-8px;left:-8px;background:#f59e0b;color:#fff;font-size:9px;font-weight:800;padding:2px 5px;border-radius:9999px;border:2px solid hsl(var(--card));line-height:1">⏳</div>`
    : "";
  const liftShadow = hovered || selected ? "0 14px 26px rgba(0,0,0,.32)" : "0 6px 16px rgba(0,0,0,.22)";
  const html = `<div class="store-marker-in store-marker-full" style="position:relative;transform:translate(-50%,-100%);white-space:nowrap;border:2px solid ${borderColor};background:${bg};color:${fg};padding:3px 12px 3px 3px;border-radius:9999px;font-weight:800;font-size:${fontSize}px;box-shadow:${liftShadow};line-height:1;display:inline-flex;align-items:center;gap:6px;transition:transform .2s cubic-bezier(.22,1,.36,1),box-shadow .2s ease,padding .2s ease,font-size .2s ease">${logoHtml}${nameHtml}<span>${priceHtml}</span>${countBadge}${stateBadge}</div>
  <style>.store-marker-in{animation:markerIn .22s cubic-bezier(.22,1,.36,1) both}.store-marker-full:hover{transform:translate(-50%,-100%) scale(1.05);box-shadow:0 14px 26px rgba(0,0,0,.32)}@keyframes markerIn{from{opacity:0;transform:translate(-50%,-100%) scale(.85)}to{opacity:1;transform:translate(-50%,-100%) scale(1)}}</style>`;
  return L.divIcon({ html, className: "", iconSize: [0, 0] });
}

export default function StoreMarker({ store, selected, hovered, compact, onSelect, onHover }: Props) {
  const icon = useMemo(
    () => buildIcon(store, selected, hovered, compact),
    [store, selected, hovered, compact],
  );
  // Tag the underlying Leaflet marker with store metadata so ClusterLayer's
  // iconCreateFunction can aggregate total offer counts across the cluster.
  const setRef = (el: L.Marker | null) => {
    if (el) (el.options as unknown as { storeMeta: MapStore }).storeMeta = store;
  };
  return (
    <Marker
      ref={setRef}
      position={[store.lat, store.lng]}
      icon={icon}
      zIndexOffset={hovered ? 2000 : selected ? 1000 : 0}
      eventHandlers={{
        click: () => onSelect(store.storeId),
        mouseover: () => onHover(store.storeId),
        mouseout: () => onHover(null),
      }}
    />
  );
}
