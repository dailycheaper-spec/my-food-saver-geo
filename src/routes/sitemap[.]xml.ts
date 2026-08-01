import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://cheaper.ge";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/search", changefreq: "daily", priority: "0.8" },
          { path: "/map", changefreq: "daily", priority: "0.8" },
          { path: "/about", changefreq: "monthly", priority: "0.4" },
          { path: "/terms", changefreq: "yearly", priority: "0.2" },
          { path: "/privacy", changefreq: "yearly", priority: "0.2" },
        ];

        // Public, indexable dynamic content: active stores and their live offers.
        try {
          const url = process.env["VITE_SUPABASE_URL"];
          const key = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
          if (url && key) {
            const supabase = createClient(url, key, {
              auth: { persistSession: false, autoRefreshToken: false },
            });
            const [{ data: stores }, { data: offers }] = await Promise.all([
              supabase.from("stores").select("id").eq("status", "active").limit(2000),
              supabase.from("offers").select("id").eq("is_active", true).limit(5000),
            ]);
            for (const s of stores ?? []) {
              entries.push({ path: `/store/${s.id}`, changefreq: "weekly", priority: "0.6" });
            }
            for (const o of offers ?? []) {
              entries.push({ path: `/offer/${o.id}`, changefreq: "daily", priority: "0.7" });
            }
          }
        } catch {
          // A database hiccup must not break the static part of the sitemap.
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
