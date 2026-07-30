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
  head: () => ({ meta: [{ title: "შესვლა · Cheaper" }, { name: "robots", content: "noindex" }] }),
  component: NativeAuthReturn,
});

function NativeAuthReturn() {
  const { t } = useI18n();
  const [deepLink, setDeepLink] = useState("ge.cheaper.app://auth-callback");
  const [slow, setSlow] = useState(false);
  const linkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    const target = `ge.cheaper.app://auth-callback${search}${hash}`;
    setDeepLink(target);

    const jump = () => {
      try {
        const a = document.createElement("a");
        a.href = target;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch {
        try { window.location.href = target; } catch { /* blocked */ }
      }
    };

    jump();
    const retry = window.setTimeout(jump, 700);
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
