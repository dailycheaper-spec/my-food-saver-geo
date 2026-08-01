import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ge.cheaper.app",
  appName: "Cheaper",
  webDir: "capacitor-webdir",
  server: {
    url: "https://cheaper.ge",
    cleartext: false,
    androidScheme: "https",
    allowNavigation: ["cheaper.ge", "*.cheaper.ge", "payment.bog.ge", "*.bog.ge"],
  },
  // CSS env(safe-area-inset-*) owns notch/home-indicator spacing (the app sets
  // viewport-fit=cover). "always" would inset the WebView on top of that and
  // double the top gap.
  ios: { contentInset: "never" },

  android: { allowMixedContent: false },
};

export default config;
