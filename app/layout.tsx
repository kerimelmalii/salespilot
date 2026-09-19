import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SalesPilot — Doğru müşteriyi bulun",
  description: "Yapay zekâ destekli şirket keşfi, doğrulama ve lead puanlama platformu.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
