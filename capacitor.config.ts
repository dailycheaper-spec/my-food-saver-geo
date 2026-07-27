import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ge.cheaper.app",
  appName: "Cheaper",
  webDir: "capacitor-webdir",
  server: {
    url: "https://cheaper.ge",
    cleartext: false,
    androidScheme: "https",
    allowNavigation: [
      "cheaper.ge",
      "*.cheaper.ge",
      "creaijcvpqerdxdazdqt.supabase.co",
      "accounts.google.com",
      "payment.bog.ge",
      "*.bog.ge",
    ],
  },
  ios: { contentInset: "always" },
  android: { allowMixedContent: false },
};

export default config;
