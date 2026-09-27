/**
 * SalesPilot - Model Fiyat Tablosu
 *
 * Model fiyatları koda dağınık biçimde yazılmaz - tek, sürümlü bir tablo.
 * Anthropic fiyat değiştirdiğinde SADECE bu dosya güncellenir; `effectiveDate`
 * geriye dönük maliyet hesaplarının bozulmaması için tutulur (ileride bir
 * çağrının hangi fiyatla hesaplandığını burada değil, o an geçerli olan
 * en güncel satırdan görürsünüz - MVP1'de geçmiş fiyat geçmişini sorgulamıyoruz,
 * sadece "şu an geçerli fiyat" kullanılıyor).
 *
 * Kaynak: https://www.anthropic.com/pricing (fiyat değiştiğinde burayı elle
 * güncelleyin - otomatik senkronizasyon yok).
 */

export interface ModelPriceEntry {
  modelName: string;
  inputPricePerMillion: number; // USD / 1M girdi tokeni
  outputPricePerMillion: number; // USD / 1M çıktı tokeni
  effectiveDate: string; // ISO tarih - bu fiyatın geçerli olduğu tarih
}

export const PRICING_TABLE: ModelPriceEntry[] = [
  {
    modelName: "claude-haiku-4-5-20251001",
    inputPricePerMillion: 1.0,
    outputPricePerMillion: 5.0,
    effectiveDate: "2025-10-01",
  },
  {
    modelName: "claude-sonnet-5",
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
    effectiveDate: "2026-01-01",
  },
];

export interface UsageCost {
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
}

/**
 * Bilinmeyen bir model için fiyat bulunamazsa maliyeti sessizce 0 gösterip
 * yanlış raporlamak yerine hata fırlatır - "0,00 USD" görünüp gerçek maliyetin
 * gözden kaçmasındansa, geliştiricinin PRICING_TABLE'ı güncellemesi gerektiğini
 * hemen fark etmesi tercih edilir.
 */
export function calculateUsageCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): UsageCost {
  const entry = PRICING_TABLE.find((p) => p.modelName === modelName);
  if (!entry) {
    throw new Error(
      `PRICING_TABLE içinde "${modelName}" için fiyat tanımlı değil. lib/salespilot/pricing.ts dosyasına ekleyin.`
    );
  }

  const inputCostUsd = (inputTokens / 1_000_000) * entry.inputPricePerMillion;
  const outputCostUsd = (outputTokens / 1_000_000) * entry.outputPricePerMillion;

  return {
    inputCostUsd,
    outputCostUsd,
    totalCostUsd: inputCostUsd + outputCostUsd,
  };
}
