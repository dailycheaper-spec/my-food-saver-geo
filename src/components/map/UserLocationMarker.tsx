import { Marker, Circle } from "react-leaflet";
import L from "leaflet";
import { useMemo } from "react";

interface Props {
  lat: number;
  lng: number;
  accuracy?: number;
}

export default function UserLocationMarker({ lat, lng, accuracy }: Props) {
  const icon = useMemo(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pulse = reduced
      ? ""
      : `<span style="position:absolute;inset:-14px;border-radius:9999px;background:hsl(var(--primary)/.25);animation:userloc-pulse 1.8s cubic-bezier(.22,.61,.36,1) infinite"></span>`;
    return L.divIcon({
      html: `<div class="user-loc-dot" style="position:relative;transform:translate(-50%,-50%)">
          ${pulse}
          <span style="position:relative;display:block;width:16px;height:16px;border-radius:9999px;background:hsl(var(--primary));border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></span>
        </div>
        <style>@keyframes userloc-pulse{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.8);opacity:0}}</style>`,
      className: "",
      iconSize: [0, 0],
    });
  }, []);
  return (
    <>
      {accuracy && accuracy > 0 && accuracy < 2000 && (
        <Circle
          center={[lat, lng]}
          radius={accuracy}
          interactive={false}
          pathOptions={{
            color: "hsl(var(--primary))",
            weight: 1,
            opacity: 0.4,
            fillColor: "hsl(var(--primary))",
            fillOpacity: 0.1,
          }}
        />
      )}
      <Marker position={[lat, lng]} icon={icon} interactive={false} keyboard={false} />
    </>
  );
}
