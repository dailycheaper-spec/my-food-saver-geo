import { useEffect, useRef, useState } from "react";

// Public merchant identifier — safe to ship in client code.
// Google Pay requires this to be present in the payment request; it's the
// same value you'd expose in a <script> tag on any Google Pay integration.
export const GOOGLE_PAY_MERCHANT_ID = "BCR2DN6D7KCZFESS";

// Set to "PRODUCTION" once the app is Google Pay–approved and wired to a
// certified payment processor (e.g. BOG's Google Pay gateway credentials).
const GPAY_ENVIRONMENT: "TEST" | "PRODUCTION" = "TEST";

declare global {
  interface Window {
    google?: {
      payments?: {
        api?: {
          PaymentsClient: new (opts: { environment: "TEST" | "PRODUCTION" }) => GPayClient;
        };
      };
    };
  }
}

interface GPayClient {
  isReadyToPay: (req: unknown) => Promise<{ result: boolean }>;
  loadPaymentData: (req: unknown) => Promise<GPayPaymentData>;
  createButton: (opts: {
    onClick: () => void;
    buttonType?: string;
    buttonColor?: "default" | "black" | "white";
    buttonSizeMode?: "static" | "fill";
  }) => HTMLElement;
}

interface GPayPaymentData {
  paymentMethodData: {
    tokenizationData: { token: string };
    info?: { cardNetwork?: string; cardDetails?: string };
  };
}

const BASE_REQUEST = {
  apiVersion: 2,
  apiVersionMinor: 0,
};

// "EXAMPLE" gateway lets the Google Pay sheet open in TEST mode without a
// real processor. Swap to { type: "PAYMENT_GATEWAY", parameters: { gateway: "bog", gatewayMerchantId: "..." } }
// once BOG issues Google Pay gateway credentials.
const TOKENIZATION_SPEC = {
  type: "PAYMENT_GATEWAY",
  parameters: {
    gateway: "example",
    gatewayMerchantId: "exampleGatewayMerchantId",
  },
} as const;

const CARD_PAYMENT_METHOD = {
  type: "CARD",
  parameters: {
    allowedAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"],
    allowedCardNetworks: ["MASTERCARD", "VISA"],
    billingAddressRequired: false,
  },
  tokenizationSpecification: TOKENIZATION_SPEC,
};

function loadGpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.google?.payments?.api) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://pay.google.com/gp/p/js/pay.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("gpay script failed")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = "https://pay.google.com/gp/p/js/pay.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("gpay script failed"));
    document.head.appendChild(s);
  });
}

interface Props {
  amount: number; // GEL
  currency?: string; // ISO 4217
  label?: string;
  onPaymentAuthorized: (token: string) => void | Promise<void>;
  onFallback?: () => void; // called when GPay is unavailable / user cancels
  disabled?: boolean;
}

/**
 * Native Google Pay button. Falls back silently when GPay is unavailable
 * (no google.com access, unsupported browser/device) — parent should keep
 * a card-based fallback flow available.
 */
export function GooglePayButton({
  amount,
  currency = "GEL",
  label,
  onPaymentAuthorized,
  onFallback,
  disabled,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const clientRef = useRef<GPayClient | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGpayScript()
      .then(async () => {
        if (cancelled) return;
        const api = window.google?.payments?.api;
        if (!api) throw new Error("gpay api missing");
        const client = new api.PaymentsClient({ environment: GPAY_ENVIRONMENT });
        clientRef.current = client;
        const res = await client.isReadyToPay({
          ...BASE_REQUEST,
          allowedPaymentMethods: [CARD_PAYMENT_METHOD],
        });
        if (cancelled) return;
        setReady(Boolean(res.result));
      })
      .catch(() => !cancelled && setReady(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !clientRef.current || !containerRef.current) return;
    containerRef.current.innerHTML = "";
    const btn = clientRef.current.createButton({
      onClick: pay,
      buttonType: "pay",
      buttonColor: "black",
      buttonSizeMode: "fill",
    });
    containerRef.current.appendChild(btn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, amount, currency]);

  async function pay() {
    if (!clientRef.current || busy || disabled) return;
    setBusy(true);
    try {
      const data = await clientRef.current.loadPaymentData({
        ...BASE_REQUEST,
        allowedPaymentMethods: [CARD_PAYMENT_METHOD],
        transactionInfo: {
          totalPriceStatus: "FINAL",
          totalPrice: amount.toFixed(2),
          currencyCode: currency,
          countryCode: "GE",
        },
        merchantInfo: {
          merchantId: GOOGLE_PAY_MERCHANT_ID,
          merchantName: "Cheaper",
        },
      });
      const token = data.paymentMethodData?.tokenizationData?.token;
      if (!token) throw new Error("No payment token returned");
      await onPaymentAuthorized(token);
    } catch (e) {
      // User dismissal or unavailable — offer parent-provided fallback
      const msg = e instanceof Error ? e.message : String(e);
      if (!/cancel|dismiss/i.test(msg)) {
        console.warn("[GPay]", msg);
      }
      onFallback?.();
    } finally {
      setBusy(false);
    }
  }

  if (ready === false) {
    // Device/browser can't do Google Pay — render nothing so parent's
    // fallback (BOG HPP card checkout) stays the primary option.
    return null;
  }

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className={`w-full min-h-[44px] ${busy ? "opacity-60 pointer-events-none" : ""}`}
        aria-label={label ?? "Google Pay"}
      />
      {ready === null && (
        <div className="h-11 rounded-full bg-muted animate-pulse" aria-hidden="true" />
      )}
    </div>
  );
}

export default GooglePayButton;
