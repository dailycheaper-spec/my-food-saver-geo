// Bounce page for BOG payment return in native shell. BOG redirects the
// in-app system browser here after the hosted payment page finishes;
// we hand control back to the packaged app via the deep-link scheme.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/orders/native-return")({
  head: () => ({ meta: [{ title: "გადახდა · Cheaper" }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    orderId: typeof s.orderId === "string" ? s.orderId : "",
    payment: typeof s.payment === "string" ? s.payment : "processing",
  }),
  component: NativeOrderReturn,
});

function NativeOrderReturn() {
  const { t } = useI18n();
  const { orderId, payment } = Route.useSearch();
  useEffect(() => {
    const q = new URLSearchParams({ orderId, payment }).toString();
    window.location.replace(`ge.cheaper.app://order-return?${q}`);
  }, [orderId, payment]);
  return (
    <div className="min-h-dvh grid place-items-center bg-background text-center px-4">
      <div>
        <div className="text-3xl mb-2">💳</div>
        <p className="font-display font-bold">{t("orders.native.returning")}</p>
      </div>
    </div>
  );
}
