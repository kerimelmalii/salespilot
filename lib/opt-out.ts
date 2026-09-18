"use client";

/**
 * MVP1'de henüz bir veritabanı yok, bu yüzden "ret etti" durumunu tarayıcının
 * localStorage'ında tutuyoruz. Bu GEÇİCİ bir çözüm - Prototip1'de gerçek bir
 * veritabanına (tüm ekip/oturumlar arasında paylaşılan) taşınmalı. Ama şimdilik
 * "bir kez ret eden şirkete bir daha mail taslağı oluşturulmasın" prensibini
 * uygulamak için yeterli.
 */

const STORAGE_KEY = "salespilot_opted_out_domains";

function readOptedOutSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function isOptedOut(domain: string): boolean {
  return readOptedOutSet().has(domain);
}

export function markOptedOut(domain: string): void {
  const set = readOptedOutSet();
  set.add(domain);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
}
