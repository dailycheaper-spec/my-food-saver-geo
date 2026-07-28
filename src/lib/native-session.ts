// Mirrors the Supabase auth session to @capacitor/preferences on native builds.
// Android WebView localStorage is not guaranteed to survive process kill /
// low-memory eviction; SharedPreferences (Android) / UserDefaults (iOS) do.
// Web builds are unaffected — plain localStorage is used as before.
import { isNative } from "./native";
import { supabase } from "@/integrations/supabase/client";

const KEY = "cheaper.supabase.session.v1";

let started = false;

export async function startNativeSessionPersistence(): Promise<void> {
  if (started || !isNative()) return;
  started = true;

  const { Preferences } = await import("@capacitor/preferences");

  // 1) Hydrate: if the WebView lost localStorage but we have a saved session,
  //    restore it before anything else queries Supabase.
  try {
    const current = await supabase.auth.getSession();
    if (!current.data.session) {
      const { value } = await Preferences.get({ key: KEY });
      if (value) {
        const parsed = JSON.parse(value) as { access_token: string; refresh_token: string };
        if (parsed?.access_token && parsed?.refresh_token) {
          await supabase.auth.setSession({
            access_token: parsed.access_token,
            refresh_token: parsed.refresh_token,
          });
        }
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[native-session] hydrate failed", err);
  }

  // 2) Persist on every change (sign-in, token refresh, sign-out).
  supabase.auth.onAuthStateChange(async (_evt, session) => {
    try {
      if (session?.access_token && session?.refresh_token) {
        await Preferences.set({
          key: KEY,
          value: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }),
        });
      } else {
        await Preferences.remove({ key: KEY });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[native-session] persist failed", err);
    }
  });
}
