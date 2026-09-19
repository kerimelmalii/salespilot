import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://salespilot-orpin.vercel.app"),
  title: { default: "SalesPilot | Yapay Zekâ Destekli B2B Satış Zekâsı", template: "%s | SalesPilot" },
  description: "SalesPilot hedef pazarınızı tarar, gerçek alıcıları doğrular ve kanıta dayalı lead puanlamayla satış fırsatlarını önceliklendirir.",
  keywords: ["B2B satış", "müşteri bulma", "lead bulma", "lead scoring", "satış zekâsı", "yapay zekâ satış"],
  authors: [{ name: "SalesPilot" }],
  creator: "SalesPilot",
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "tr_TR", url: "/", siteName: "SalesPilot", title: "SalesPilot | Yapay Zekâ Destekli B2B Satış Zekâsı", description: "Doğru şirketleri bulun, kanıtlarla değerlendirin ve satış fırsatına dönüştürün." },
  twitter: { card: "summary_large_image", title: "SalesPilot | B2B Satış Zekâsı", description: "Doğru şirketleri bulun, kanıtlarla değerlendirin ve satış fırsatına dönüştürün." },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SalesPilot",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: "https://salespilot-orpin.vercel.app",
    description: "Yapay zekâ destekli B2B şirket keşfi, doğrulama ve lead puanlama platformu.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "TRY", description: "Ücretsiz demo" },
  };
  return (
    <html lang="tr">
      <body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} /></body>
    </html>
  );
}
