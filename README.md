# SalesPilot

Bu proje `00-durum-ve-kararlar.md` ve `01-mvp1-yol-haritasi.md`
dokümanlarındaki plana göre sıfırdan kuruluyor. Şu an **Faz 0**
tamamlandı: temel Next.js + Serper arama altyapısı.

## Kurulum

```bash
npm install
cp .env.example .env.local
# .env.local içine kendi DATABASE_URL, SERPER_API_KEY ve ANTHROPIC_API_KEY'inizi girin
npm run db:migrate
npm run dev
```

Tarayıcıda `http://localhost:3000` açın. "Yeni Tarama (test)" formu şu an
sadece arama adımını test ediyor - kanıta dayalı puanlama henüz UI'ya
bağlı değil (bkz. "Durum" bölümü).

## Durum (17 Eylül 2026)

**Tamamlandı - Faz 0:**
- Next.js 16 + TypeScript + Tailwind kurulumu.
- `app/api/search/route.ts` — Serper ile çalışan arama endpoint'i:
  kriterlerden birkaç sorgu üretir, sosyal medya sonuçlarını eler,
  domain bazında tekilleştirir.
- Güvenlik: bağımlılıklarda 0 açık (`npm audit` ile doğrulandı), prompt
  injection savunması `lib/salespilot/prompts.ts` içinde
  (`UNTRUSTED_CONTENT_RULE`).

**Tamamlandı - Faz 1:**
- `lib/salespilot/scraping.ts` — şirket sitesini kazıma: robots.txt'ye
  saygı (tamamen yasaklıyorsa dokunmuyor), kendini tanıtan User-Agent,
  bir sayfa başarısız olursa diğerlerine devam ediyor, HTML'den temiz
  metin çıkarma (`extractCleanText`). Bu fonksiyon gerçek bir HTML
  örneğiyle test edildi (script/nav/footer temizliği doğrulandı) - ağ
  erişimi gerektirmeyen kısım.
- `app/api/research/route.ts` — kazıma + `researchCompany()`'i bağlıyor.
- `app/api/score/route.ts` — `scoreCompany()`'i bağlıyor.
- `app/page.tsx` — test sayfası artık uçtan uca zinciri gösteriyor: ara →
  her şirket için "Tümünü Araştır ve Puanla" → puan + gerekçe.
- `npm run build` ve `npx tsc --noEmit` hatasız geçti, 0 güvenlik açığı.

**TEST EDİLEMEDİ (bu ortamdan ağ erişimi yok):** Gerçek bir domain'e
gidip robots.txt okuma, sayfa kazıma ve Serper'a gerçek istek atma. Bu
kısmı kendi ortamınızda, gerçek API key'lerle deneyeceksiniz - bkz.
"Kurulum" bölümü.

**Sırada - Faz 2:** Sonuç listesi ekranının nihai tasarımı (mockup'lara
göre) ve iletişim bilgisi bulma (Faz 3). Bkz. `01-mvp1-yol-haritasi.md`.

## İlk gerçek pilot testinden çıkan düzeltmeler (17 Eylül 2026)

Kullanıcı gerçek key'lerle 20 şirketlik bir tarama çalıştırdı. Sonuçlar
genel olarak güven verici (en iyi eşleşmeler - Efe Kardeşler Ambalaj 85,
Orego 85, Tar-Taş Gıda 75 - gerçekten mantıklı ve distribütör/üretici
farkını doğru yakalıyordu), ama üç gerçek sorun bulundu ve düzeltildi:

1. **Ek kriterler şirketten şirkete farklı yorumlanıyordu** (bir şirkette
   "Sürdürülebilirlik" diye icat edilmiş bir kriter, başka birinde "Kendi
   markası" - kullanıcı bunları hiç istemedi). Kök neden: kriterler her
   şirket için ayrı ayrı ayrıştırılıyordu. **Düzeltme:** yeni
   `/api/criteria` endpoint'i + `parseExtraCriteria()` fonksiyonu,
   kriterleri tarama başına BİR KEZ sabit bir cetvele çeviriyor, tüm
   şirketler bu cetvelle ölçülüyor.
2. **Sonuçların yarısı şirket değildi** (rehber siteleri, arama motorları,
   ticaret odaları, devlet kurumları araştırılıp puanlanıyordu - bütçe
   israfı). **Düzeltme:** `app/api/search/route.ts`'e bilinen dizin/arama
   motoru domain listesi + `.gov.tr`/`.org.tr` filtresi eklendi (test
   verisinde 20'de 9'unu eledi).
3. **Bir sonuç İngilizce çıktı** (kaynak sayfa İngilizceyse model dili
   taklit ediyordu). **Düzeltme:** tüm promptlara `TURKISH_OUTPUT_RULE`
   eklendi.

**Henüz teşhis edilemedi:** `burkutambalaj.com.tr` için "Araştırma
sırasında bir hata oluştu" hatası alındı, sebebi belirsiz. Hata
mesajlarını artık daha detaylı döndürüyoruz (`research`/`score`
route'ları gerçek hata metnini de gönderiyor) - tekrar denenip gerçek
hata mesajı görülmeli. `sfr.com.tr` 85 puan aldı ama gerekçesi UI'da
görünmedi ve "gıda üreticileri" araması için bir ambalaj/ilaç sektörü
sitesi olması şüpheli - bu da tekrar test edilip kontrol edilmeli.

## Bu API anahtarlarını nereden alırım?

- Serper: https://serper.dev (ücretsiz kotayla başlar)
- Anthropic: https://console.anthropic.com

## Önemli - güvenlik

`.env.local` dosyanızı ASLA git'e commit etmeyin (`.gitignore`'da zaten
hariç tutuldu). Yeni bir bağımlılık eklerken `npm audit` çalıştırmayı
alışkanlık edinin.

## Deploy etmeden önce - şifre koruması (17 Eylül 2026)

MVP1'de henüz gerçek kullanıcı hesapları yok (bu Prototip1'de geliyor).
Siteyi gerçek bir adrese koyduğunuzda, rastgele internet trafiğinin
API bütçenizi tüketmesini önlemek için basit bir paylaşılan şifre
eklendi:

- `.env.local`'e `SITE_PASSWORD` (kendi belirlediğiniz bir şifre) ve
  `SESSION_SECRET` (rastgele bir metin, örn. `openssl rand -hex 32`
  komutuyla üretilir) ekleyin.
- Site artık `/giris` sayfasında şifre soruyor, doğru şifre girilmeden
  hiçbir sayfaya veya API'ye erişilemiyor.
- Ayrıca `/api/search`, `/api/research`, `/api/score`, `/api/criteria`
  endpoint'lerine IP başına basit bir istek sınırı eklendi
  (`lib/rate-limit.ts`) - bellek içi, düşük hacimli pilot için yeterli,
  gerçek ölçekte (Prototip1) paylaşılan bir çözüme (Vercel KV/Upstash)
  geçilmeli.

Pilot şirketlere paylaşacağınız link ile birlikte bu şifreyi de ayrıca
(örn. telefonla veya ayrı bir mesajla) iletin - aynı mailde göndermeyin.

## Ölçüm sistemi (Faz 6 - 28 Eylül 2026)

Her tarama artık kalıcı bir Postgres veritabanına (`DATABASE_URL`) yazılıyor -
tarayıcı geçmişi/localStorage değil. Bu, "sonuçlar iyi/kötü görünüyor" gibi
öznel değerlendirmeler yerine sürümler arası sayısal karşılaştırma yapabilmek
için gerekli (bkz. proje kökündeki tasarım tartışması).

**Şema:** `lib/db/schema.ts` (Drizzle ORM) - `scan_runs`, `search_queries`,
`search_results`, `company_candidates`, `company_evaluations`,
`evidence_records`, `contact_emails`, `ai_usage_logs`, `scan_errors`,
`human_reviews`. Migration dosyaları `lib/db/migrations/` altında, git'e
commit edilir (production'da da AYNI migration'lar çalıştırılmalı).

**Komutlar:**

```bash
npm run db:generate  # schema.ts değiştiğinde yeni migration dosyası üretir
npm run db:migrate   # bekleyen migration'ları DATABASE_URL'e uygular
npm run db:studio    # veritabanını tarayıcıda incelemek için Drizzle Studio
```

**Uygulamada neler ölçülüyor:**
- Her tarama bir `scanId` alır; arama sorguları, ham Serper sonuçları (elenenler
  eleme nedeniyle birlikte), tekilleştirilmiş şirket adayları, araştırma
  kanıtları, puanlama sonuçları, her Anthropic çağrısının token/maliyet/süresi
  ve tüm hatalar bu kimliğe bağlı olarak kaydedilir.
- Puanlama adımı artık `sectorMatchClass`, `buyerStatus`, `competitorStatus`,
  `evidenceConfidence`, `commercialRole` gibi ayrıştırılmış kategoriler de
  üretiyor (bkz. `lib/salespilot/prompts.ts` - aynı çağrıda, ek maliyet yok).
- Sonuç kartlarında "Doğru hedef / Olası hedef / Hedef değil / Rakip /
  Kararsızım" butonları var - kullanıcının GERÇEK değerlendirmesi
  `human_reviews` tablosuna yazılır ve sistemin tahminiyle karşılaştırılarak
  precision, yanlış pozitif/negatif hesaplanır.
- "📊 Tarama Raporu" butonu `GET /api/scan-report?scanId=...` üzerinden ham
  sonuç sayısı, benzersiz domain, elenen/nitelikli/olası eşleşme sayıları,
  precision, kanıtlı sonuç oranı, token/maliyet ve toplam süreyi gösterir.

**Bilinen sınırlamalar (dürüstçe belirtilmeli):**
- `scan_runs` şemasında "5 hedef müşteri profili öner" adımı için ayrılmış
  alanlar (`generatedProfiles`, `selectedProfileIds`) var ama bu ÖZELLİK henüz
  uygulamada yok - alanlar şimdilik boş kalıyor, ileride bu adım eklenirse
  şema hazır.
- "Resmi domain doğrulama oranı" gibi bazı metrikler tasarım dokümanındaki
  tam karşılığına sahip değil (örn. ülke/şehir çıkarımı henüz AI tarafından
  yapılmıyor) - `lib/salespilot/report.ts` içindeki yorumlarda hangi
  metriğin nasıl yaklaşıklandığı not edildi.
- Recall'ı ölçmek için gereken "önceden doğrulanmış test seti" (adım 10) bir
  veri toplama süreci - `human_reviews` altyapısı hazır ama test seti zamanla,
  gerçek pilot taramalarla birikir.

## Deploy (Vercel önerisi)

En kolay yol Vercel (Next.js'in kendi platformu, ücretsiz katmanı var):

1. Bu projeyi bir GitHub reposuna push edin.
2. vercel.com'da hesap açıp reponuzu bağlayın.
3. Vercel Dashboard → Storage → Create Database → Postgres ile bir veritabanı
   oluşturun (proje ile otomatik bağlanır, `DATABASE_URL` dahil ortam
   değişkenlerini otomatik ekler) - veya kendi Neon/Supabase bağlantı dizenizi
   `DATABASE_URL` olarak elle girin.
4. Environment Variables kısmına `SERPER_API_KEY`, `ANTHROPIC_API_KEY`,
   `SITE_PASSWORD`, `SESSION_SECRET` değerlerini girin (`.env.local`'e
   değil, Vercel'in kendi ayarlarına).
5. `npm run db:migrate` komutunu production `DATABASE_URL`'iniz ile ÇALIŞTIRIN
   (yerel makinenizden `DATABASE_URL=<production-url> npm run db:migrate`) -
   bu adım otomatik değil, ilk deploy'dan önce ve her yeni migration'da elle
   yapılmalı.
6. Deploy edin - size `proje-adi.vercel.app` gibi ücretsiz bir adres
   verecek. İsterseniz sonra kendi domain'inizi bağlayabilirsiniz.
