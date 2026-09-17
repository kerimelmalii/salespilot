# SalesPilot — Mvp1 Yol Haritası

_Hazırlanma tarihi: 17 Eylül 2026_

Bu doküman Mvp1'i tek kullanıcılı, sade bir şekilde inşa etmek için sıralı bir
plan. Gördüğümüz tasarımlar (ekip, kanban, karşılaştırma paneli, gelişmiş
raporlar) **Prototip1'in vizyonu** — Mvp1 bunların çok daha basit hali.

## Mvp1'in kapsamı

### Var
- Tek kullanıcı (ekip/sorumlu atama yok)
- Yeni Tarama formu (kendi şirket bilgisi + hedef müşteri kriterleri)
- Arama (Serper — zaten çalışıyor)
- Kanıta dayalı araştırma + puanlama (bugün hazırladığımız AI katmanı)
- Sonuç listesi: **tüm** bulunan şirketler, puanla sıralı
- Puan detayı: 4 kriter + her birinin gerekçesi ve kanıtı
- Tekli/çoklu seçim → AI ile mail taslağı
- Sabit, manuel girilmiş bir ürün/hizmet açıklaması (metin, dosya değil)
- Onay ekranı: Düzenle / Onayla ve Gönder
- İYS ret cümlesi otomatik ekleniyor + ret eden lead'e bir daha taslak
  üretilmiyor
- Gönderim sonrası basit, MANUEL durum güncelleme (AI sınıflandırma yok)

### Yok (sonraki aşamalara bırakılıyor)
- Ekip özellikleri, sorumlu atama, birden fazla kullanıcı
- Şirket Karşılaştırma paneli, ayrı "AI Analizi" sekmesi (SWOT vb.)
- Kanban/takvim/harita görünümleri, gelişmiş Raporlar dashboard'u
- WhatsApp
- Serbest metin + belge yükleyip AI'nın hedef kitleyi çıkarsaması (Mvp2)
- Gelen cevapların AI ile otomatik sınıflandırılması (Mvp1'de MANUEL yapılır)

---

## Faz 0 — Temel kurulum (sıfırdan) ✅ Tamamlandı (17 Eylül 2026)
**Not (17 Eylül 2026 güncellemesi):** Önceki prototip silindi, sıfırdan
başlanıldı.

**Yapıldı:**
1. Next.js 16 + TypeScript projesi kuruldu.
2. `.env.example` ile `SERPER_API_KEY` / `ANTHROPIC_API_KEY` alanları
   tanımlandı (gerçek değerler kullanıcı tarafından girilecek).
3. `/api/search` endpoint'i yazıldı: kriterlerden birkaç Google araması
   oluşturuyor, Serper'a gönderiyor, sosyal medya sonuçlarını eliyor,
   domain bazında tekilleştiriyor.
4. `npm run build` + `npx tsc --noEmit` ile derleme doğrulandı, `npm audit`
   ile 0 güvenlik açığı teyit edildi.

**Doğrulanamadı (bu ortamdan ağ erişimi yok):** Serper'a gerçek istek
atıp gerçek sonuç dönüp dönmediği - bu kullanıcı tarafından kendi
ortamında test edilecek.

## Faz 1 — Araştırma + kanıta dayalı puanlama ✅ Tamamlandı (17 Eylül 2026)
**Yapıldı:**
1. `lib/salespilot/scraping.ts` yazıldı: robots.txt kontrolü (tamamen
   yasaklıyorsa dokunmuyor), kendini tanıtan User-Agent, sabit bir sayfa
   listesi (ana sayfa, hakkımızda, ürünler, ihracat, iletişim vb.), bir
   sayfa başarısız olursa diğerlerine devam ediyor.
2. `app/api/research/route.ts` — kazıma + `researchCompany()`'i bağladı.
3. `app/api/score/route.ts` — `scoreCompany()`'i bağladı.
4. `extractCleanText()` fonksiyonu gerçek bir HTML örneğiyle test edildi
   (script/nav/footer temizliği, gerçek içeriğin korunması) - bu, ağ
   erişimi gerektirmeyen kısım olduğu için burada doğrulanabildi.

**Doğrulandı (17 Eylül 2026, ikinci pilot turu - lojistik/SaaS sektörü):**
Alıcı uygunluğu kontrolü canlı testte doğrulandı - 7/7 rakip şirket
doğru işaretlendi (filoplan, atspro, filojistik, multinet, loggerise,
filoasist, selectbilisim), gerçek müşterilerin 4/5'i tamamen temiz
kaldı (yanlışlıkla düşürülmedi). Tek sınır durum (alu.com.tr) hâlâ
işaretleniyor ama artık genel bir "hizmet sunucu" kuralıyla değil,
o şirkete özgü savunulabilir bir gerekçeyle - istenen davranış bu.

## Faz 3 — İletişim bilgisi bulma ✅ Tamamlandı (17 Eylül 2026)
**Not (17 Eylül 2026):** Test sayfasında zaten kaba bir gösterim var
(bulunan e-posta, hangi sayfadan geldiğiyle birlikte).

**Yapıldı:**
1. `extractEmailsFromHtml()` — mailto linklerini VE düz metindeki e-posta
   görünümlü ifadeleri regex ile buluyor. Bu adım AI KULLANMIYOR, tamamen
   deterministik - "e-posta uydurmayacağız" prensibi kodda garanti altında.
2. Yanlış pozitifler filtreleniyor (analytics script'lerindeki sahte
   adresler, görsel dosya adları gibi `logo@2x.png`).
3. `rankEmailCandidates()` — birden fazla adres bulunursa genel kurumsal
   olanları (info@, bilgi@, iletisim@ vb.) kişisel görünenlerin önüne
   alıyor.
4. `CompanyResearch.contactEmails` alanı artık `researchCompany()`
   çıktısında dolu geliyor, hiçbir adres bulunamazsa boş dizi (asla
   tahmin/icat yok).
5. Gerçekçi bir HTML örneğiyle test edildi (mailto + düz metin + sahte
   pozitifler) - 5/5 kontrol geçti, ağ erişimi gerekmeyen kısım.

**Doğrulanamadı (ağ erişimi yok):** Gerçek şirket sitelerinde bulunan
adreslerin doğruluğu - kullanıcı kendi ortamında test edecek.

## Faz 2 — Sonuç listesi ekranı
**Not (17 Eylül 2026):** Test sayfasında (`app/page.tsx`) zaten kaba bir
liste + puan + e-posta gösterimi var (fonksiyonel ama tasarlanmamış). Bu
faz o listeyi mockup'lardaki görünüme taşıyor.

**Ne yapılacak:**
1. Basit bir tablo: Şirket adı · Sektör · Şehir · Puan · Nitelikli rozeti.
   Puana göre sıralı (yüksekten düşüğe).
2. Satıra tıklayınca detay paneli: 4 kriterin puanı + her birinin
   gerekçesi + kaynak (hangi sayfadan, kısa özet).
3. Satırların yanında checkbox — tekli/çoklu seçim.

**Bitti sayılır çünkü:** Kullanıcı "neden bu puanı aldı" sorusuna ekranda
cevap bulabiliyor, listeden şirket seçebiliyor.

## Faz 4 — Mail oluşturma + onay ekranı
**Ne yapılacak:**
1. Ayarlar'a tek bir alan: "Ürün/Hizmet Açıklaması" (manuel, sabit metin —
   şimdilik katalog dosyası değil).
2. Seçilen lead(ler) için `draftEmail()` ile taslak üret.
3. Basit bir düzenleme ekranı: konu + gövde metni değiştirilebilir.
4. Onay ekranı: "Düzenle" / "Onayla ve Gönder" butonları. Ret cümlesi
   taslakta otomatik yer alıyor, kaldırılamaz.
5. `consentStatus === "opted_out"` olan lead için bu ekran hiç açılmıyor.

**Bitti sayılır çünkü:** AI hazırlıyor, insan onaylıyor, mail hazır.

## Faz 5 — Gönderim + basit durum takibi
**Ne yapılacak:**
1. Kurumsal e-posta hesabı üzerinden gönderim (Gmail API veya SMTP).
2. Her lead için tek bir "Durum" alanı, MANUEL güncellenen:
   Gönderildi → Cevap Geldi (İlgileniyor / İlgilenmiyor / Fiyat İstedi /
   Görüşme İstedi) → Fırsat.
3. Basit bir sayaç: kaç şirket bulundu, kaçı nitelikli, kaç mail gönderildi,
   kaçından cevap geldi, kaç fırsat oluştu. (Grafik değil, sade sayılar.)

**Bitti sayılır çünkü:** Uçtan uca döngü çalışıyor VE pilot metriğini
ölçebiliyorsunuz — AI sınıflandırma olmadan, siz elle işaretleyerek.

## Faz 6 — Pilot testi
- 10 şirket, farklı sektörlerden, ücretsiz deneme.
- Faz 5'teki sayaçla huniyi ölçün: bulunan → nitelikli → gönderilen →
  cevap → fırsat.
- Bu veri Mvp2'ye geçiş kararını besleyecek.

---

## Öneri: sırayla gidin, atlamayın
Her faz bir öncekinin üzerine gerçek veri üretiyor (araştırma olmadan
puanlama olmaz, puanlama olmadan mail kişiselleştirilemez). Fazları
paralelleştirmeye çalışmak muhtemelen entegrasyon sırasında karışıklık
yaratır — küçük bir proje için sıralı gitmek daha hızlı bitirir.
