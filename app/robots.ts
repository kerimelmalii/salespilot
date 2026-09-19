import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/panel/", "/api/", "/giris", "/kayit"] },
    sitemap: "https://salespilot-orpin.vercel.app/sitemap.xml",
  };
}
