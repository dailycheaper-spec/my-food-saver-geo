import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { withVisibilityMany } from "@/lib/realtime-visibility";

const STORAGE_KEY = "cheaper.partner.soundAlerts"; // "on" | "off"
const PROMPT_KEY = "cheaper.partner.soundAlerts.prompted"; // "1"

export function getSoundPref(): "on" | "off" | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "on" || v === "off" ? v : null;
}

export function setSoundPref(v: "on" | "off") {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, v);
  window.localStorage.setItem(PROMPT_KEY, "1");
  window.dispatchEvent(new CustomEvent("cheaper:sound-pref", { detail: v }));
}

export function wasPrompted(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(PROMPT_KEY) === "1";
}

let sharedCtx: AudioContext | null = null;

// An open AudioContext keeps the page out of bfcache — suspend it while hidden.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!sharedCtx) return;
    if (document.visibilityState === "hidden") {
      void sharedCtx.suspend();
    } else if (sharedCtx.state === "suspended") {
      void sharedCtx.resume();
    }
  });
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!sharedCtx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      sharedCtx = new Ctor();
    }
    if (sharedCtx.state === "suspended") void sharedCtx.resume();
    return sharedCtx;
  } catch {
    return null;
  }
}

export function playNewOrderBeep() {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const tones: Array<[number, number]> = [
    [880, now],
    [1320, now + 0.18],
  ];
  for (const [freq, at] of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.14, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.24);
  }
}

export function useSoundPref() {
  const [pref, setPref] = useState<"on" | "off" | null>(() => getSoundPref());
  useEffect(() => {
    const on = (e: Event) => setPref(((e as CustomEvent).detail as "on" | "off") ?? getSoundPref());
    window.addEventListener("cheaper:sound-pref", on);
    return () => window.removeEventListener("cheaper:sound-pref", on);
  }, []);
  return {
    pref,
    enabled: pref === "on",
    prompted: pref !== null || (typeof window !== "undefined" && window.localStorage.getItem(PROMPT_KEY) === "1"),
    enable: () => { setSoundPref("on"); getCtx(); playNewOrderBeep(); },
    disable: () => setSoundPref("off"),
    dismiss: () => { if (typeof window !== "undefined") { window.localStorage.setItem(PROMPT_KEY, "1"); setPref((p) => p); } },
  };
}

/**
 * Subscribes to INSERT events on `orders` for every provided store id and
 * plays a debounced beep — but only for events that arrive AFTER mount, never
 * for rows that already existed. Respects the persisted sound preference.
 */
export function useNewOrderSound(storeIds: string[], enabled: boolean) {
  const lastPlayedRef = useRef(0);
  const enabledRef = useRef(enabled);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  const ids = storeIds.filter(Boolean).sort().join(",");

  const trigger = useCallback(() => {
    if (!enabledRef.current) return;
    const now = Date.now();
    if (now - lastPlayedRef.current < 2000) return;
    lastPlayedRef.current = now;
    playNewOrderBeep();
  }, []);

  useEffect(() => {
    if (!ids) return;
    const idList = ids.split(",");
    const mountedAt = Date.now();
    const stop = withVisibilityMany(() => idList.map((sid) =>
      supabase
        .channel(`partner-sound-${sid}-${mountedAt}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "orders", filter: `store_id=eq.${sid}` },
          () => trigger(),
        )
        .subscribe(),
    ));
    return () => { stop(); };
  }, [ids, trigger]);
}
