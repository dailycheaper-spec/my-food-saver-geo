import { useEffect, useState } from "react";
import { DISTRICT_COORDS, TBILISI_CENTER, type Offer } from "@/lib/mock-data";
import "leaflet/dist/leaflet.css";

function hashOffset(id: string): [number, number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const dx = ((h & 0xff) / 255 - 0.5) * 0.012;
  const dy = (((h >> 8) & 0xff) / 255 - 0.5) * 0.012;
  return [dx, dy];
}

function offerCoords(o: Offer): [number, number] {
  if (o.lat != null && o.lng != null) return [o.lat, o.lng];
  const base = DISTRICT_COORDS[o.district] ?? TBILISI_CENTER;
  const [dx, dy] = hashOffset(o.id);
  return [base[0] + dx, base[1] + dy];
}

export function OfferMiniMap({ offer }: { offer: Offer }) {
  const [Comp, setComp] = useState<null | React.ComponentType>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ MapContainer, TileLayer, Marker, CircleMarker, Popup }, L] = await Promise.all([
        import("react-leaflet"),
        import("leaflet"),
      ]);
      const pos = offerCoords(offer);
      const icon = L.divIcon({
        className: "offer-mini-marker",
        html: `<div style="background:hsl(var(--primary));color:hsl(var(--primary-foreground));padding:6px 10px;border-radius:9999px;font-weight:700;font-size:12px;box-shadow:0 4px 12px rgba(0,0,0,.25);white-space:nowrap;">📍 ${offer.storeName}</div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });
      const C = () => (
        <MapContainer center={pos} zoom={15} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png"
          />
          <Marker position={pos} icon={icon}>
            <Popup>
              <div style={{ fontWeight: 600 }}>{offer.storeName}</div>
              <div style={{ fontSize: 12 }}>{offer.address}, {offer.district}</div>
            </Popup>
          </Marker>
          {userPos && (
            <CircleMarker center={userPos} radius={8} pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.9 }}>
              <Popup>შენ აქ ხარ</Popup>
            </CircleMarker>
          )}
        </MapContainer>
      );
      if (!cancelled) setComp(() => C);
    })();
    return () => { cancelled = true; };
  }, [offer, userPos]);

  function locate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setUserPos([p.coords.latitude, p.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  return (
    <div className="mt-4 bg-card rounded-2xl shadow-card border border-border overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="font-semibold">მდებარეობა რუკაზე</div>
        <button
          onClick={locate}
          className="text-xs font-medium text-primary hover:underline"
        >
          📍 ჩემი მდებარეობა
        </button>
      </div>
      <div className="h-64 w-full bg-muted">
        {Comp ? <Comp /> : <div className="h-full grid place-items-center text-xs text-muted-foreground">იტვირთება რუკა…</div>}
      </div>
      <div className="px-5 py-3 text-xs text-muted-foreground flex items-center justify-between">
        <span>{offer.address}, {offer.district}</span>
        <span>~{offer.distanceKm} კმ</span>
      </div>
    </div>
  );
}
