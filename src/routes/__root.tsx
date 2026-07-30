import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { BottomNav } from "@/components/BottomNav";
import { AppTracker } from "@/components/AppTracker";
import { AndroidBackHandler } from "@/components/AndroidBackHandler";
import { PwaInstall } from "@/components/PwaInstall";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { supabase } from "@/integrations/supabase/client";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { CityProvider } from "@/lib/city";
import { UserLocationProvider } from "@/hooks/use-user-location";
import { Toaster } from "@/components/ui/sonner";


function NotFoundComponent() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 animate-fade-in">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">{t("notFound.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("notFound.text")}
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft press hover:opacity-95"
        >
          {t("notFound.backHome")}
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  const { t } = useI18n();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 animate-fade-in" role="alert">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">{t("errorBoundary.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("errorBoundary.text")}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground press hover:opacity-95"
          >
            {t("errorBoundary.retry")}
          </button>
          <a
            href="/"
            className="rounded-2xl border border-input px-5 py-2.5 text-sm font-semibold hover:bg-accent hover:text-accent-foreground press"
          >
            {t("errorBoundary.home")}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0EAC45" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Cheaper" },
      { title: "Cheaper — იაფად, 50%+ ფასდაკლებით" },
      { name: "description", content: "იყიდე ხაჭაპური, სუში, ხილი, ცომეული და მარკეტის კალათები 50%-ზე მეტი ფასდაკლებით — ვაკე, საბურთალო, ვერა და მთელი თბილისი." },
      { name: "author", content: "Cheaper" },
      { property: "og:title", content: "Cheaper — იაფად, 50%+ ფასდაკლებით" },
      { property: "og:description", content: "იყიდე ხაჭაპური, სუში, ხილი, ცომეული და მარკეტის კალათები 50%-ზე მეტი ფასდაკლებით — ვაკე, საბურთალო, ვერა და მთელი თბილისი." },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "ka_GE" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Cheaper — იაფად, 50%+ ფასდაკლებით" },
      { name: "twitter:description", content: "იყიდე ხაჭაპური, სუში, ხილი, ცომეული და მარკეტის კალათები 50%-ზე მეტი ფასდაკლებით — ვაკე, საბურთალო, ვერა და მთელი თბილისი." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/09b7cf16-3e6f-4195-b08e-503d732108a8/id-preview-e9d84b2d--d22d8f17-b970-4d52-b002-48ff4a24743c.lovable.app-1783946305502.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/09b7cf16-3e6f-4195-b08e-503d732108a8/id-preview-e9d84b2d--d22d8f17-b970-4d52-b002-48ff4a24743c.lovable.app-1783946305502.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },

      { rel: "icon", href: "/icon-512.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ka" suppressHydrationWarning>
      <head suppressHydrationWarning><HeadContent /></head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      if (event === "SIGNED_OUT") queryClient.clear();
    });

    // Native (Capacitor) deep-link handler for the ge.cheaper.app:// scheme.
    // Handles both OAuth return (/auth-callback) and BOG payment return
    // (/order-return). No-op in the browser.
    let unsubscribeDeepLink: (() => void) | null = null;
    void (async () => {
      const {
        registerDeepLinkHandler,
        getNativeLaunchUrl,
        closeExternal,
        setNativeOAuthCallbackPending,
      } = await import("@/lib/native");
      let lastHandledUrl: string | null = null;
      const processingUrls = new Set<string>();
      const handleNativeUrl = async (url: string) => {
        if (url === lastHandledUrl || processingUrls.has(url)) return;
        processingUrls.add(url);
        try {
          const u = new URL(url);
          const host = u.host || u.pathname.replace(/^\/+/, "");
          if (host.startsWith("auth-callback")) {
            setNativeOAuthCallbackPending(true);
            // Tokens arrive in the hash (implicit flow); PKCE returns ?code=.
            const hashRaw = u.hash?.startsWith("#") ? u.hash.slice(1) : u.hash || "";
            const hashParams = new URLSearchParams(hashRaw);
            const queryParams = new URLSearchParams(u.search.replace(/^\?/, ""));
            const access_token = hashParams.get("access_token") || queryParams.get("access_token");
            const refresh_token = hashParams.get("refresh_token") || queryParams.get("refresh_token");
            const code = queryParams.get("code");
            const oauthError =
              queryParams.get("error_description") ||
              queryParams.get("error") ||
              hashParams.get("error_description") ||
              hashParams.get("error");

            let ok = false;
            if (access_token && refresh_token) {
              const { error } = await supabase.auth.setSession({ access_token, refresh_token });
              ok = !error;
            } else if (code) {
              const { error } = await supabase.auth.exchangeCodeForSession(code);
              ok = !error;
            }

            await closeExternal();
            if (!ok) {
              setNativeOAuthCallbackPending(false);
              const { toast } = await import("sonner");
              toast.error(oauthError || "Sign-in could not be completed. Please try again.");
              router.navigate({ to: "/auth" });
              return;
            }
            const storedTarget = sessionStorage.getItem("auth_redirect") || "/";
            sessionStorage.removeItem("auth_redirect");
            let target = "/";
            try {
              const parsedTarget = new URL(storedTarget, window.location.origin);
              if (parsedTarget.origin === window.location.origin) {
                target = `${parsedTarget.pathname}${parsedTarget.search}${parsedTarget.hash}`;
              }
            } catch {
              target = "/";
            }
            lastHandledUrl = url;
            setNativeOAuthCallbackPending(false);
            router.navigate({ to: target });
          } else if (host.startsWith("order-return")) {
            const p = u.searchParams;
            const orderId = p.get("orderId");
            const payment = p.get("payment") || "processing";
            await closeExternal();
            if (orderId) {
              lastHandledUrl = url;
              router.navigate({ to: "/orders/$id", params: { id: orderId }, search: { payment } as never });
            }
          }
        } catch (err) {
          setNativeOAuthCallbackPending(false);
          console.warn("[deep-link] failed to handle", url, err);
        } finally {
          processingUrls.delete(url);
        }
      };

      // Register first so a foreground callback cannot race session hydration.
      unsubscribeDeepLink = await registerDeepLinkHandler(({ url }) => handleNativeUrl(url));
      const { startNativeSessionPersistence } = await import("@/lib/native-session");
      await startNativeSessionPersistence();

      const launchUrl = await getNativeLaunchUrl();
      if (launchUrl) await handleNativeUrl(launchUrl);
    })();

    return () => {
      data.subscription.unsubscribe();
      unsubscribeDeepLink?.();
    };
  }, [queryClient, router]);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <CityProvider>
          <UserLocationProvider>
            <a
              href="#content"
              className="sr-only-focusable text-sm font-semibold"
            >
              Skip to content
            </a>
            <main id="content" className="pb-[env(safe-area-inset-bottom,0px)]">
              <Outlet />
            </main>
            <BottomNav />
            <AppTracker />
            <AndroidBackHandler />
            <PwaInstall />
            <Toaster position="top-center" richColors />
            <UpdatePrompt />
          </UserLocationProvider>
        </CityProvider>
      </I18nProvider>

    </QueryClientProvider>
  );
}
