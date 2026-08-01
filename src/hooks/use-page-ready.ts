import { useEffect, useState } from "react";

/**
 * Preloads a small set of above-the-fold images and reports when the route is
 * safe to fade in. Never blocks longer than `timeoutMs` so a slow 3G asset
 * can't hold the screen hostage.
 */
export function usePageReady({
  dataReady = true,
  images = [],
  timeoutMs = 1200,
}: {
  dataReady?: boolean;
  images?: (string | null | undefined)[];
  timeoutMs?: number;
} = {}): boolean {
  const [imagesReady, setImagesReady] = useState(false);
  const key = images.filter(Boolean).join("|");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!dataReady) return;

    const urls = key ? key.split("|") : [];
    if (urls.length === 0) {
      setImagesReady(true);
      return;
    }

    let alive = true;
    let pending = urls.length;
    const done = () => {
      if (!alive) return;
      pending -= 1;
      if (pending <= 0) setImagesReady(true);
    };

    for (const url of urls) {
      const img = new Image();
      img.onload = done;
      img.onerror = done;
      img.src = url;
      if (img.complete) done();
    }

    const timer = window.setTimeout(() => { if (alive) setImagesReady(true); }, timeoutMs);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [dataReady, key, timeoutMs]);

  return dataReady && imagesReady;
}
