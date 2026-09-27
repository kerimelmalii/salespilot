import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Tek bir bağlantı havuzu - Next.js'in serverless/edge fonksiyonlarında her
 * modül yeniden yüklendiğinde yeniden oluşturulmaması için globalThis'e
 * önbelleklenir (Next.js dev modunda hot-reload sırasında bağlantı sızıntısını
 * önler - resmi Drizzle/Next.js önerisi).
 *
 * TEMBEL BAĞLANTI: bağlantı, modül import edilirken DEĞİL, `db` ilk gerçekten
 * kullanıldığında kurulur. Aksi halde `next build` sırasında route
 * modüllerinin taranması (DATABASE_URL ortam değişkeninin build makinesinde
 * henüz olmayabileceği bir an) build'i çökertir - diğer env değişkenleri
 * (SERPER_API_KEY, ANTHROPIC_API_KEY) neden istek anında kontrol ediliyorsa,
 * bu da aynı sebeple istek anına ertelenir.
 */

declare global {
  var __salespilotDbClient: PostgresJsDatabase<typeof schema> | undefined;
}

function getOrCreateDb(): PostgresJsDatabase<typeof schema> {
  if (globalThis.__salespilotDbClient) return globalThis.__salespilotDbClient;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL tanımlı değil. .env.local dosyasına (yerel Postgres) veya " +
        "Vercel proje ayarlarına (production) ekleyin - bkz. README.md \"Ölçüm veritabanı\" bölümü."
    );
  }

  const client = postgres(connectionString, { max: 10 });
  const instance = drizzle(client, { schema });
  globalThis.__salespilotDbClient = instance;
  return instance;
}

export const db: PostgresJsDatabase<typeof schema> = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getOrCreateDb(), prop, receiver);
  },
});
