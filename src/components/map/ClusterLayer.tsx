import { useMemo, type ReactNode } from "react";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { MapStore } from "@/routes/map";

interface Props {
  children: ReactNode;
}

/**
 * Wraps store markers in a cluster group. Cluster bubbles show the total
 * number of active offers across the grouped stores (not the store count).
 * StoreMarker attaches its `storeMeta` to each Leaflet marker's options via
 * a ref callback, and we read it back here to aggregate.
 */
export default function ClusterLayer({ children }: Props) {
  const iconCreateFunction = useMemo(
    () => (cluster: L.MarkerCluster) => {
      let total = 0;
      let hasAlmost = false;
      let anyAvailable = false;
      let missingMeta = false;
      for (const m of cluster.getAllChildMarkers()) {
        const opts = m.options as unknown as { storeMeta?: MapStore };
        const meta = opts.storeMeta;
        if (meta) {
          total += meta.activeCount;
          if (meta.hasAlmost) hasAlmost = true;
          if (meta.activeCount > 0) anyAvailable = true;
        } else {
          missingMeta = true;
          total += 1;
        }
      }
      if (missingMeta) anyAvailable = true;
      const bg = !anyAvailable
        ? "hsl(var(--muted-foreground))"
        : hasAlmost
        ? "#f59e0b"
        : "hsl(var(--primary))";
      const html = `<div class="cheaper-cluster" style="width:46px;height:46px;border-radius:9999px;background:${bg};color:#fff;display:grid;place-items:center;font-weight:800;font-size:15px;border:3px solid #fff;box-shadow:0 8px 20px rgba(0,0,0,.32);cursor:pointer;transition:transform .2s cubic-bezier(.22,1,.36,1),box-shadow .2s ease;animation:clusterIn .28s cubic-bezier(.22,1,.36,1) both"><span style="line-height:1">${total}</span></div><style>.cheaper-cluster:hover{transform:scale(1.08);box-shadow:0 12px 26px rgba(0,0,0,.38)}@keyframes clusterIn{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}</style>`;
      return L.divIcon({ html, className: "", iconSize: [46, 46] });
    },
    [],
  );

  return (
    <MarkerClusterGroup
      chunkedLoading
      showCoverageOnHover={false}
      maxClusterRadius={55}
      spiderfyOnMaxZoom
      iconCreateFunction={iconCreateFunction}
    >
      {children}
    </MarkerClusterGroup>
  );
}
