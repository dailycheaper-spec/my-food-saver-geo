import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { OFFERS } from "@/lib/mock-data";

const BASE_URL = "";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/favorites", changefreq: "weekly", priority: "0.6" },
          { path: "/orders", changefreq: "weekly", priority: "0.5" },
          { path: "/notifications", changefreq: "monthly", priority: "0.4" },
          { path: "/profile", changefreq: "monthly", priority: "0.3" },
          ...OFFERS.map((o) => ({ path: `/offer/${o.id}`, changefreq: "daily" as const, priority: "0.7" })),
        ];
        const urls = entries.map((e) =>
          `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <changefreq>${e.changefreq}</changefreq>\n    <priority>${e.priority}</priority>\n  </url>`,
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
