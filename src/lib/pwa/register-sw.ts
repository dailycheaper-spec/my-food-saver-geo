// Guarded service worker registration.
// Never registers in dev / Lovable preview / iframe. Supports ?sw=off kill switch.
// See PWA skill.

const APP_SW_PATH = "/sw.js";

function isPreviewHost(hostname: string): boolean {
  if (hostname.startsWith("id-preview--") || hostname.startsWith("preview--")) return true;
  if (hostname === "lovableproject.com" || hostname.endsWith(".lovableproject.com")) return true;
  if (hostname === "lovableproject-dev.com" || hostname.endsWith(".lovableproject-dev.com")) return true;
  if (hostname === "beta.lovable.dev" || hostname.endsWith(".beta.lovable.dev")) return true;
  return false;
}

async function unregisterAppSw() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith(APP_SW_PATH);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    /* noop */
  }
}

export type SwUpdateHandler = (reload: () => void) => void;

export async function registerServiceWorker(onUpdateAvailable?: SwUpdateHandler) {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const inIframe = window.self !== window.top;
  const url = new URL(window.location.href);
  const swOff = url.searchParams.get("sw") === "off";
  const isProd = import.meta.env.PROD;
  const previewHost = isPreviewHost(window.location.hostname);

  if (!isProd || inIframe || previewHost || swOff) {
    await unregisterAppSw();
    return;
  }

  try {
    const reg = await navigator.serviceWorker.register(APP_SW_PATH, { scope: "/" });

    const notify = () => {
      if (!onUpdateAvailable) return;
      onUpdateAvailable(() => {
        reg.waiting?.postMessage({ type: "SKIP_WAITING" });
      });
    };

    if (reg.waiting && navigator.serviceWorker.controller) notify();

    reg.addEventListener("updatefound", () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener("statechange", () => {
        if (sw.state === "installed" && navigator.serviceWorker.controller) notify();
      });
    });

    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  } catch {
    /* noop */
  }
}
