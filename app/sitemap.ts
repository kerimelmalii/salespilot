import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog-posts";

const baseUrl = "https://salespilot-orpin.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/blog", "/fiyatlandirma", "/hakkimizda"].map((path, index) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date("2026-09-19"),
    changeFrequency: index === 1 ? "weekly" as const : "monthly" as const,
    priority: index === 0 ? 1 : index === 1 ? 0.8 : 0.7,
  }));
  const posts = BLOG_POSTS.map((post) => ({ url: `${baseUrl}/blog/${post.slug}`, lastModified: new Date(post.publishedAt), changeFrequency: "monthly" as const, priority: 0.7 }));
  return [...pages, ...posts];
}
