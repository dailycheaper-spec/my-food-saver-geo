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
import { PwaInstall } from "@/components/PwaInstall";
import { supabase } from "@/integrations/supabase/client";
import { I18nProvider } from "@/lib/i18n";
import { CityProvider } from "@/lib/city";
import { UserLocationProvider } from "@/hooks/use-user-location";


function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 animate-fade-in">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">გვერდი ვერ მოიძებნა · Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          გვერდი, რომელსაც ეძებთ, არ არსებობს ან გადატანილია.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft press hover:opacity-95"
        >
          მთავარზე დაბრუნება
        </a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 animate-fade-in" role="alert">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">გვერდი ვერ ჩაიტვირთა</h1>
        <p className="mt-2 text-sm text-muted-foreground">რაღაც შეცდომაა. სცადეთ თავიდან.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground press hover:opacity-95"
          >
            თავიდან ცდა
          </button>
          <a
            href="/"
            className="rounded-2xl border border-input px-5 py-2.5 text-sm font-semibold hover:bg-accent hover:text-accent-foreground press"
          >
            მთავარი
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
      { name: "theme-color", content: "#3d7a4a" },
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
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;500;600;700;800&family=Noto+Serif+Georgian:wght@600;700;800&display=swap",
      },
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
      const { registerDeepLinkHandler, closeExternal } = await import("@/lib/native");
      unsubscribeDeepLink = await registerDeepLinkHandler(async ({ url }) => {
        try {
          const u = new URL(url);
          const host = u.host || u.pathname.replace(/^\/+/, "");
          if (host.startsWith("auth-callback")) {
            // Tokens arrive in the hash (implicit flow) or query.
            const raw = (u.hash?.startsWith("#") ? u.hash.slice(1) : u.hash) || u.search.replace(/^\?/, "");
            const params = new URLSearchParams(raw);
            const access_token = params.get("access_token");
            const refresh_token = params.get("refresh_token");
            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token });
            }
            await closeExternal();
            const target = sessionStorage.getItem("auth_redirect") || "/";
            router.navigate({ to: target });
          } else if (host.startsWith("order-return")) {
            const p = u.searchParams;
            const orderId = p.get("orderId");
            const payment = p.get("payment") || "processing";
            await closeExternal();
            if (orderId) {
              router.navigate({ to: "/orders/$id", params: { id: orderId }, search: { payment } as never });
            }
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn("[deep-link] failed to handle", url, err);
        }
      });
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
            <main id="content" className="pb-20 sm:pb-24">
              <Outlet />
            </main>
            <BottomNav />
            <AppTracker />
            <PwaInstall />
          </UserLocationProvider>
        </CityProvider>
      </I18nProvider>

    </QueryClientProvider>
  );
}
