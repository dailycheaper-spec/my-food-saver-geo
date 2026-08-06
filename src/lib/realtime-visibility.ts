import { supabase } from "@/integrations/supabase/client";

type Channel = ReturnType<typeof supabase.channel>;

/**
 * An always-open WebSocket keeps the page out of the browser's back/forward
 * cache (bfcache), which makes returning from an external redirect (e.g. a bank
 * payment page) trigger a full reload instead of an instant restore.
 *
 * `withVisibility` closes the realtime channel while the tab is hidden and
 * reopens it — plus runs an optional refetch so nothing goes stale — when the
 * tab becomes visible again.
 *
 * Usage inside a `useEffect`:
 *   const stop = withVisibility(
 *     () => supabase.channel("topic").on(...).subscribe(),
 *     load,
 *   );
 *   return () => stop();
 */
export function withVisibility(create: () => Channel, onResume?: () => void) {
  let ch: Channel | null = null;
  const subscribe = () => { if (!ch) ch = create(); };
  const unsubscribe = () => { if (ch) { void supabase.removeChannel(ch); ch = null; } };
  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      unsubscribe();
    } else {
      subscribe();
      onResume?.();
    }
  };
  if (typeof document === "undefined" || document.visibilityState !== "hidden") subscribe();
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);
  return () => {
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility);
    unsubscribe();
  };
}

/** Same as `withVisibility` but for a group of channels created together. */
export function withVisibilityMany(create: () => Channel[], onResume?: () => void) {
  let chs: Channel[] = [];
  const subscribe = () => { if (chs.length === 0) chs = create(); };
  const unsubscribe = () => { chs.forEach((c) => { void supabase.removeChannel(c); }); chs = []; };
  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      unsubscribe();
    } else {
      subscribe();
      onResume?.();
    }
  };
  if (typeof document === "undefined" || document.visibilityState !== "hidden") subscribe();
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);
  return () => {
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility);
    unsubscribe();
  };
}
