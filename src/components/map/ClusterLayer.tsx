import { Children, cloneElement, isValidElement, useMemo, type ReactNode } from "react";
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
 * We read `offerCount` from each child marker's leaflet options; StoreMarker
 * is a react-leaflet <Marker/>, and we tag its options via a ref on mount.
 */
export default function ClusterLayer({ children }: Props) {
  const iconCreateFunction = useMemo(
    () => (cluster: L.MarkerCluster) => {
      let total = 0;
      let hasAlmost = false;
      let anyAvailable = false;
      for (const m of cluster.getAllChildMarkers()) {
        const opts = m.options as unknown as { storeMeta?: MapStore };
        const meta = opts.storeMeta;
        if (meta) {
          total += meta.activeCount;
          if (meta.hasAlmost) hasAlmost = true;
          if (meta.activeCount > 0) anyAvailable = true;
        } else {
          total += 1;
        }
      }
      const bg = !anyAvailable
        ? "hsl(var(--muted-foreground))"
        : hasAlmost
        ? "#f59e0b"
        : "hsl(var(--primary))";
      const html = `<div class="cheaper-cluster" style="width:44px;height:44px;border-radius:9999px;background:${bg};color:#fff;display:grid;place-items:center;font-weight:800;font-size:14px;border:3px solid #fff;box-shadow:0 6px 16px rgba(0,0,0,.28);animation:markerIn .22s ease-out both">${total}</div>`;
      return L.divIcon({ html, className: "", iconSize: [44, 44] });
    },
    [],
  );

  // Attach storeMeta to each child Marker's leaflet options via ref, so
  // iconCreateFunction can aggregate offer counts.
  const wrapped = useMemo(
    () =>
      Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        const props = child.props as { store?: MapStore } & Record<string, unknown>;
        const store = props.store;
        if (!store) return child;
        const prevRef = (child as unknown as { ref?: unknown }).ref as
          | ((el: L.Marker | null) => void)
          | { current: L.Marker | null }
          | null
          | undefined;
        const setRef = (el: L.Marker | null) => {
          if (el) (el.options as unknown as { storeMeta: MapStore }).storeMeta = store;
          if (typeof prevRef === "function") prevRef(el);
          else if (prevRef && typeof prevRef === "object") prevRef.current = el;
        };
        return cloneElement(child as never, { ref: setRef } as never);
      }),
    [children],
  );

  return (
    <MarkerClusterGroup
      chunkedLoading
      showCoverageOnHover={false}
      maxClusterRadius={55}
      spiderfyOnMaxZoom
      iconCreateFunction={iconCreateFunction}
    >
      {wrapped}
    </MarkerClusterGroup>
  );
}
