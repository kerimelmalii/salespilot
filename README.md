# SalesPilot

Bu proje `00-durum-ve-kararlar.md` ve `01-mvp1-yol-haritasi.md`
dokümanlarındaki plana göre sıfırdan kuruluyor. Şu an **Faz 0**
tamamlandı: temel Next.js + Serper arama altyapısı.

## Kurulum

```bash
npm install
cp .env.example .env.local
# .env.local içine kendi SERPER_API_KEY ve ANTHROPIC_API_KEY'inizi girin
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

## Lead kalitesi revizyonu (18 Eylül 2026)

Almanya/CNC pilotunda arama sonuçlarının şirket yerine liste, blog ve ürün
sayfalarını lead saydığı; ayrıca CNC makine üreticilerinin lineer hareket
bileşenleri için alıcı olmalarına rağmen rakip diye elendiği görüldü. Akış
şu şekilde yeniden kuruldu:

- Hedef ülkenin Google pazarı/dili kullanılıyor. Claude tarama başına altı
  alıcı odaklı sorguyu hedef ülkenin yerel dilinde üretiyor; başarısız olursa
  deterministik çoklu sorgular devreye giriyor.
- Dizin, pazar yeri, sosyal ağ, kamu/okul domainleri ve tekil “en iyi 15...”
  türü liste yazıları araştırma bütçesi harcanmadan eleniyor.
- Arama sonucu URL'si artık otomatik olarak şirket kabul edilmiyor. Araştırma
  resmî siteyi, gerçek şirket adını, varlık türünü ve ticari rolü doğruluyor.
- OEM/makine üreticisi, sistem entegratörü, son kullanıcı, distribütör ve
  doğrudan rakip ayrı sınıflar. Ürünü kendi makinesine entegre eden OEM doğal
  alıcı kabul ediliyor; “aynı sektörde” olmak tek başına rakip sayılmıyor.
- `totalScore` (ticari uygunluk) ile `evidenceConfidence` (kanıt yeterliliği)
  ayrıldı. Veri azlığı artık 0 puan/uygunsuzluk yerine `needs_research`
  durumuna yol açıyor.
- Sabit URL listesine ek olarak sitedeki Hakkımızda/Ürünler/Uygulamalar/
  İletişim/Impressum bağlantıları dinamik keşfediliyor; Almanca yollar eklendi.
- Gönderilebilir e-posta yalnızca doğrulanmış şirket domain'iyle eşleşiyorsa
  kabul ediliyor. Liste yazarı, ajans veya ücretsiz e-posta adresi lead'e
  bağlanmıyor.
- `npm test` altında OEM, listicle/dizin, kanıt yetersizliği ve e-posta domain
  doğrulaması için regresyon testleri bulunuyor.

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

## Deploy (Vercel önerisi)

En kolay yol Vercel (Next.js'in kendi platformu, ücretsiz katmanı var):

1. Bu projeyi bir GitHub reposuna push edin.
2. vercel.com'da hesap açıp reponuzu bağlayın.
3. Environment Variables kısmına `SERPER_API_KEY`, `ANTHROPIC_API_KEY`,
   `SITE_PASSWORD`, `SESSION_SECRET` değerlerini girin (`.env.local`'e
   değil, Vercel'in kendi ayarlarına).
4. Deploy edin - size `proje-adi.vercel.app` gibi ücretsiz bir adres
   verecek. İsterseniz sonra kendi domain'inizi bağlayabilirsiniz.
