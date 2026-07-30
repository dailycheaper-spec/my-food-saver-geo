// Bounce page: after Google OAuth, the backend redirects here with the session
// tokens in the URL hash (or an authorization code in the query). On web this
// route is never reached (auth flow uses the popup/web_message path). On
// native, we forward everything to the app's custom scheme so the packaged
// shell can finish sign-in.
//
// Custom Tabs / SFSafariViewController frequently block *automatic* navigations
// to a custom app scheme, which leaves the user signed in inside the browser
// tab but signed out in the app. So we: (1) try an anchor click (survives more
// restrictions than location.replace), (2) retry once, and (3) always show a
// big button so there is a real user gesture available.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth/native-return")({
  head: () => ({
    meta: [
      { title: "შესვლა · Cheaper" },
      { name: "description", content: "Cheaper მობილურ აპში შესვლის დასრულება." },
      { property: "og:title", content: "შესვლა · Cheaper" },
      { property: "og:description", content: "Cheaper მობილურ აპში შესვლის დასრულება." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NativeAuthReturn,
});

function NativeAuthReturn() {
  const { t } = useI18n();
  const [deepLink, setDeepLink] = useState("ge.cheaper.app://auth-callback");
  const [slow, setSlow] = useState(false);
  const linkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const hash = window.location.hash || "";
    const sourceParams = new URLSearchParams(window.location.search);
    const platform = sourceParams.get("platform");
    sourceParams.delete("platform");
    const search = sourceParams.size ? `?${sourceParams.toString()}` : "";
    const target = `ge.cheaper.app://auth-callback${search}${hash}`;
    setDeepLink(target);

    const jump = () => {
      try {
        // A top-level custom-scheme navigation is handled reliably by Chrome
        // Custom Tabs and SFSafariViewController when the app is installed.
        window.location.assign(target);
      } catch {
        // Some browsers reject location.assign but allow a link activation.
      }
      try {
        const a = document.createElement("a");
        a.href = target;
        a.rel = "noopener";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch {
        try { window.location.href = target; } catch { /* blocked */ }
      }
    };

    jump();
    // Android Custom Tabs can need a moment after the auth redirect commits
    // before they permit navigation to an external app scheme.
    const retry = window.setTimeout(jump, platform === "android" ? 900 : 500);
    const slowTimer = window.setTimeout(() => setSlow(true), 2200);
    return () => {
      window.clearTimeout(retry);
      window.clearTimeout(slowTimer);
    };
  }, []);

  return (
    <div className="min-h-dvh grid place-items-center bg-background text-center px-4">
      <div className="max-w-sm w-full">
        <div className="text-3xl mb-2">🥗</div>
        <p className="font-display font-bold">{t("auth.native.title")}</p>
        <a
          ref={linkRef}
          href={deepLink}
          className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-card"
        >
          {t("auth.native.openApp")}
        </a>
        <p className="text-sm text-muted-foreground mt-3">
          {slow ? t("auth.native.tapButton") : t("auth.native.notOpened")}
        </p>
      </div>
    </div>
  );
}
