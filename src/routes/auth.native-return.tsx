// Bounce page: after Google OAuth, Supabase redirects here with the session
// tokens in the URL hash. On web this route is never reached (auth flow uses
// the popup/web_message path). On native, we forward the hash to the app's
// custom scheme so the packaged shell can finish sign-in.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/auth/native-return")({
  head: () => ({ meta: [{ title: "შესვლა · Cheaper" }, { name: "robots", content: "noindex" }] }),
  component: NativeAuthReturn,
});

function NativeAuthReturn() {
  useEffect(() => {
    const hash = window.location.hash || "";
    const search = window.location.search || "";
    // Preserve both fragments — Supabase uses hash for implicit flow,
    // some providers add ?error=... in the query.
    window.location.replace(`ge.cheaper.app://auth-callback${search}${hash}`);
  }, []);
  return (
    <div className="min-h-dvh grid place-items-center bg-background text-center px-4">
      <div>
        <div className="text-3xl mb-2">🥗</div>
        <p className="font-display font-bold">ვამოწმებთ შესვლას…</p>
        <p className="text-sm text-muted-foreground mt-2">
          თუ აპლიკაცია არ გაიხსნა ავტომატურად,{" "}
          <a href="ge.cheaper.app://auth-callback" className="underline">გახსენით ხელით</a>.
        </p>
      </div>
    </div>
  );
}
