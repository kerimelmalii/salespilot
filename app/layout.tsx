import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SalesPilot",
  description: "Daha fazla müşteri, doğru zamanda bul.",
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
