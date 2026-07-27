/**
 * Build identifier, replaced at build time by the `__APP_BUILD_ID__` define in
 * vite.config.ts. It's baked into both the client bundle and the server bundle,
 * so the client can compare its own id with `/api/public/version` and prompt a
 * reload when a newer web build has been published.
 */
declare const __APP_BUILD_ID__: string | undefined;

export const APP_BUILD_ID: string =
  typeof __APP_BUILD_ID__ === "string" ? __APP_BUILD_ID__ : "dev";
