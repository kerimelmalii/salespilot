import { ImageResponse } from "next/og";

export const alt = "SalesPilot — Yapay zekâ destekli B2B satış zekâsı";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f7f9fd", color: "#0f172a", padding: "72px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "18px", fontSize: 30, fontWeight: 700 }}><div style={{ width: 54, height: 54, borderRadius: 14, background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>SP</div>SalesPilot</div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 930 }}><div style={{ display: "flex", flexWrap: "wrap", fontSize: 72, lineHeight: 1.05, letterSpacing: "-3px", fontWeight: 700 }}>Ekibiniz araştırmaya değil,&nbsp;<span style={{ color: "#2563eb" }}>satışa zaman ayırsın.</span></div><div style={{ marginTop: 30, fontSize: 27, color: "#64748b" }}>Yapay zekâ destekli B2B şirket keşfi ve lead puanlama.</div></div>
    </div>,
    size
  );
}
