import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MapPin, Navigation } from "lucide-react";
import { OFFERS, DISTRICT_COORDS, TBILISI_CENTER, formatPrice, type Offer } from "@/lib/mock-data";
import "leaflet/dist/leaflet.css";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "რუკა — ახლომდებარე შემოთავაზებები | გემო" },
      { name: "description", content: "იხილე შემოთავაზებები რუკაზე, გაიგე ზუსტი მდებარეობა და მანძილი." },
    ],
  }),
  component: MapPage,
});

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

function MapPage() {
  const [mounted, setMounted] = useState(false);
  const [MapComp, setMapComp] = useState<null | React.ComponentType<{ userPos: [number, number] | null; selectedId: string | null; onSelect: (id: string) => void }>>(null);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    (async () => {
      const [{ MapContainer, TileLayer, Marker, CircleMarker, Popup, useMap }, L] = await Promise.all([
        import("react-leaflet"),
        import("leaflet"),
      ]);

      function Recenter({ pos }: { pos: [number, number] | null }) {
        const map = useMap();
        useEffect(() => { if (pos) map.setView(pos, 14); }, [pos, map]);
        return null;
      }

      const Comp = ({ userPos, selectedId, onSelect }: { userPos: [number, number] | null; selectedId: string | null; onSelect: (id: string) => void }) => {
        const center = userPos ?? TBILISI_CENTER;
        return (
          <MapContainer center={center} zoom={13} scrollWheelZoom className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png"
            />
            <Recenter pos={userPos} />
            {userPos && (
              <CircleMarker center={userPos} radius={9} pathOptions={{ color: "#1e40af", fillColor: "#3b82f6", fillOpacity: 1, weight: 3 }}>
                <Popup>თქვენ აქ ხართ</Popup>
              </CircleMarker>
            )}
            {OFFERS.map((o) => {
              const [lat, lng] = offerCoords(o);
              const discount = Math.round((1 - o.price / o.originalPrice) * 100);
              const isSel = selectedId === o.id;
              const icon = L.divIcon({
                className: "gemo-marker",
                html: `<div style="transform:translate(-50%,-100%);display:inline-flex;align-items:center;gap:4px;background:${isSel ? "#166534" : "#ffffff"};color:${isSel ? "#fff" : "#166534"};padding:4px 8px;border-radius:9999px;border:2px solid #166534;box-shadow:0 4px 10px rgba(0,0,0,.18);font-weight:700;font-size:12px;white-space:nowrap;font-family:system-ui"><span>${o.storeLogo}</span><span>${o.price.toFixed(0)}₾</span><span style="opacity:.7;font-weight:600">-${discount}%</span></div>`,
                iconSize: [0, 0],
                iconAnchor: [0, 0],
              });
              return (
                <Marker
                  key={o.id}
                  position={[lat, lng]}
                  icon={icon}
                  eventHandlers={{ click: () => onSelect(o.id) }}
                >
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>{o.storeName}</div>
                      <div style={{ fontSize: 12, color: "#555" }}>{o.title}</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>{o.address} · {o.distanceKm} კმ</div>
                      <div style={{ marginTop: 6 }}>
                        <span style={{ textDecoration: "line-through", color: "#888", fontSize: 11, marginRight: 6 }}>{o.originalPrice.toFixed(2)} ₾</span>
                        <b style={{ color: "#166534" }}>{o.price.toFixed(2)} ₾</b>
                      </div>
                      <a href={`/offer/${o.id}`} style={{ display: "inline-block", marginTop: 8, color: "#166534", fontWeight: 700, fontSize: 12 }}>დეტალურად →</a>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        );
      };
      setMapComp(() => Comp);
    })();
  }, []);

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setUserPos([p.coords.latitude, p.coords.longitude]),
      () => setUserPos(TBILISI_CENTER),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const selected = useMemo(() => OFFERS.find((o) => o.id === selectedId) ?? null, [selectedId]);

  return (
    <div className="fixed inset-0 top-0 bottom-16 flex flex-col bg-background">
      <div className="absolute top-0 inset-x-0 z-[1000] p-3 flex items-center justify-between gap-2 pointer-events-none">
        <Link to="/" className="pointer-events-auto w-10 h-10 rounded-full bg-card shadow-elevated grid place-items-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="pointer-events-auto bg-card shadow-elevated rounded-full px-4 py-2 text-sm font-semibold flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-primary" /> რუკის ხედი · {OFFERS.length} შემოთავაზება
        </div>
        <button onClick={locate} className="pointer-events-auto w-10 h-10 rounded-full bg-primary text-primary-foreground shadow-elevated grid place-items-center" aria-label="ჩემი მდებარეობა">
          <Navigation className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 relative">
        {mounted && MapComp ? (
          <MapComp userPos={userPos} selectedId={selectedId} onSelect={setSelectedId} />
        ) : (
          <div className="h-full w-full grid place-items-center text-sm text-muted-foreground">რუკის ჩატვირთვა...</div>
        )}
      </div>

      {selected && (
        <div className="absolute bottom-20 inset-x-3 z-[1000] bg-card rounded-2xl shadow-elevated p-3 flex gap-3 border border-border">
          <img src={selected.image} alt="" width={72} height={72} className="w-18 h-18 rounded-xl object-cover" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground truncate">{selected.storeName} · {selected.district}</div>
            <div className="font-semibold text-sm truncate">{selected.title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">📍 {selected.distanceKm} კმ · აღება {selected.pickupFrom}–{selected.pickupTo}</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-muted-foreground line-through">{formatPrice(selected.originalPrice)}</span>
              <span className="text-base font-bold text-primary">{formatPrice(selected.price)}</span>
            </div>
          </div>
          <Link to="/offer/$id" params={{ id: selected.id }} className="self-center bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold">
            შეძენა
          </Link>
        </div>
      )}
    </div>
  );
}
