# SalesPilot — Durum ve Kararlar

_Son güncelleme: 18 Eylül 2026_

## 18 Eylül 2026 — Keşif kalitesi kararı
- Sabit 10 şirketlik pilot yaklaşımı kaldırıldı.
- Her taramada varsayılan hedef en az 50 şirket adayıdır. Doğrulama
  kayıpları için keşif katmanı 70 adaylık bir güvenlik havuzu toplamaya
  çalışır.
- Sistem 14-16 farklı yerel dil sorgusuyla OEM, entegratör, son kullanıcı,
  alt sektör ve kullanım senaryolarını tarar; hedefe ulaşamazsa sonraki
  sonuç sayfalarına adaptif olarak genişler, hedefe ulaşınca durur.
- Dar bir pazarda 50 gerçek aday yoksa sayı sahte veya ilgisiz şirketlerle
  tamamlanmaz; eksik açıkça gösterilir.
- Ek kriter girilmediğinde 70 puanlık çekirdek cetvel 100'e normalize edilir.
  Böylece varsayılan 75 eşiği her taramada karşılaştırılabilir kalır.

## Proje özeti
Bir işletmenin ürün/hizmetini kime satabileceğini internetten otomatik
araştıran, potansiyel müşterileri kanıta dayalı puanlayan, iletişim bilgisini
bulan ve kişiselleştirilmiş satış e-postası hazırlayan sistem. Akış:
**Doğru şirketi bul → araştır → puanla → iletişim bilgisi bul →
kişiselleştirilmiş mesaj hazırla → kullanıcı onaylarsa gönder.**

## Temel prensipler (değişmez)
- **AI hazırlar, insan gönderir.** Hiçbir mesaj (mail veya WhatsApp) insan
  onayı olmadan gönderilmez.
- **Uydurmama kuralı.** Bilinmeyen bilgi asla icat edilmez; "doğrulanamadı"
  diye işaretlenir. Her puanın bir kanıta bağlı olması zorunlu.
- **Şeffaflık.** Her puanın gerekçesi kullanıcıya gösterilir.
- **Güvenlik katmanlı ele alınır, tek bir "üst seviye" ayar değildir.**
  Detaylı kontrol listesi `salespilot-ai-layer/README.md` içinde; en kritik
  ve sisteme özel madde: araştırma adımı güvenilmeyen web sitelerinden
  kazınan metni AI'ya veriyor, bu metin asla talimat olarak yorumlanmaz
  (kod içinde `UNTRUSTED_CONTENT_RULE` ile uygulanıyor, kaldırılmaz).

## Kullanıcı tercihleri (Kerim)
- Kurumsal e-posta alınacak (kişisel Gmail yerine) — deliverability ve İYS
  kaydı için.
- Şu an ekip yok; satış/pazarlama planı ayrıca ele alınacak.
- Farklı iş kolları (teknik geliştirme, tasarım, pazarlama/sosyal medya,
  satış) için bu projede ayrı sohbetler açılacak — Sinema Okulu projesindeki
  "haftalık ayrı sohbet" desenine benzer şekilde.

## Kod tabanı sıfırlandı (17 Eylül 2026)
- Önceki Next.js prototipi (çalışan `/api/search` dahil) Kerim tarafından
  silinmek zorunda kalındı. **Geliştirme sıfırdan başlıyor.**
- Bu, aşağıdaki "Teslim edilen dosyalar" bölümündeki `salespilot-ai-layer/`
  kod parçalarını (types.ts, prompts.ts, pipeline.ts) etkilemiyor — onlar
  hâlâ geçerli ve yeni projeye entegre edilecek. Etkilenen sadece daha önce
  var olan Next.js iskeleti ve Serper entegrasyonu.
- Detaylı, sıfırdan build sırası için bkz. `01-mvp1-yol-haritasi.md`
  (Faz 0: temel Next.js + Serper kurulumu, artık "zaten hazır" değil).

## Yol haritası (17 Eylül 2026'da kararlaştırıldı)

### Mvp1
- Kullanıcı kendi şirket/ürün bilgisini ve hedef müşteri kriterlerini
  (sektör, bölge, ürün uyumu, ek kriterler serbest metin) girer.
- SalesPilot arama başlatır, bulunan **tüm** şirketleri listeler, her biri
  puanıyla gösterilir (75+ = nitelikli, ama hepsi görünür).
- **Kanıta dayalı puanlama Mvp1'e dahildir** — basit kelime eşleştirmesi
  değil, araştırma + gerekçeli skor baştan bu şekilde kurulacak (bkz.
  `salespilot-ai-layer/` klasöründeki types.ts / prompts.ts / pipeline.ts).
- Listeden tekli/çoklu seçim → mail taslağı oluşturma. Mail dili/içeriği
  düzenlenebilir. Ürün kataloğu başlangıçta manuel eklenir.
- Onay ekranı zorunlu: Düzenle / Onayla ve Gönder.
- İYS opt-out teknik iskeleti bu aşamada kurulur (ret cümlesi mailde otomatik
  yer alır, `consentStatus` alanı `opted_out` olan lead'e bir daha mail
  taslağı üretilmez) — bu ücretsiz pilotta bile maliyeti sıfıra yakın, o
  yüzden erken kuruluyor.

### Mvp1 → Mvp2 arası: Pilot 1
- Her taramada en az 50 aday hedefleyen gerçek aramalar, farklı sektörlerle
  denenecek (tek sektörde kanıtlanmış olmak yetmiyor).
- Ölçülecek huni: bulunan → nitelikli → onaylanan → gönderilen → cevap →
  gerçek fırsat. Bu huni her pilot turunda AYNI şekilde ölçülecek, böylece
  Mvp1→Mvp2 karşılaştırılabilir olacak.

### Mvp2
- Mvp1'in tüm özellikleri + hedef firma tanımı için uzun serbest metin ve
  belge yükleme. AI bu girdiyi analiz edip hedef kitleyi kendisi çıkarsar,
  gerekirse birden fazla arama yapar.
- **Güvenlik adımı (zorunlu):** AI, arama/puanlamaya başlamadan önce
  "Anladığım hedef kitle şu: ..." diye özet gösterip kullanıcıdan onay/
  düzeltme alır. Bu, yanlış yorumlanan hedefin onlarca şirkette gereksiz
  araştırma+puanlama maliyetine dönüşmesini önler.

### Mvp2 → Prototip1 arası: Pilot 2
- Yine 10 pilot şirket, aynı huni metrikleriyle ölçüm.

### Prototip1 — satışa hazır, satış başlar
- Mvp2'nin sorunlardan ayrışmış hâli.
- **Satışa hazırlık kontrol listesi (bu noktada tamamlanmalı, "özellik"
  değil "şart" olarak görülmeli):**
  - Gerçek İYS kaydı (kurumsal iletişim adreslerinin sisteme yüklenmesi).
  - Kurumsal gönderim altyapısı: domain + SPF/DKIM/DMARC kurulumu.
  - Sözleşmede "hizmet sağlayıcı" sorumluluğunun müşteri şirkette olduğunun
    net yazılması (yasal sorumluluk zinciri için).
  - Gerçek kullanıcı kimlik doğrulama + oturum yönetimi (çoklu müşteri
    birbirinin verisini görmeyecek şekilde izole).
  - Gmail/e-posta OAuth'ta minimum kapsam + token'ların şifreli saklanması.
  - KVKK/VERBİS kaydının gerekip gerekmediğinin kontrolü (17 Eylül 2026'da
    kesin eşik doğrulanamadı, satıştan önce güncel mevzuata bakılmalı).

### PrototipMvp — WhatsApp eklentisi
- Rasyonel: KOBİ'lerde mail göz ardı edilebiliyor, WhatsApp daha etkili.
- **Karar (17 Eylül 2026):** WhatsApp gönderimi resmi olmayan bir bot ile
  toplu/otomatik yapılmayacak — bu, gönderim hızından bağımsız olarak
  Meta'nın tespit ettiği ve numarayı yasakladığı bir risk taşıyor.
  - Düşük hacimde: AI taslak hazırlar, kullanıcı `wa.me` linkine tıklayıp
    kendi WhatsApp'ından elle gönderir (mail akışındaki "AI hazırlar, insan
    gönderir" prensibiyle aynı).
  - Gerçek ölçekte (yüzlerce/binlerce gönderim) tek güvenli yol: resmi
    WhatsApp Business Platform (Cloud API) + Meta onaylı şablon + alıcının
    gerçek opt-in'i. Bu, serbest metin yerine şablon kullanmayı gerektirir
    ama numara yasaklanma riskini ortadan kaldırır. Opt-in, muhtemelen mail
    akışındaki cevap sınıflandırma adımına bağlanacak ("WhatsApp'tan da
    yazabilir miyiz?" sorusu).

### PrototipMvp → Prototip2 arası: Pilot 3
- Satış devam ederken 10 şirketle WhatsApp entegrasyonu pilot olarak
  denenir, verilere göre düzenleme yapılır.

### Prototip2
- WhatsApp entegrasyonu ile çalışan, olgun prototipin satışı.

## Hukuki notlar (17 Eylül 2026 araştırması)
- **E-posta / İYS:** Türkiye'de tacir/esnaf (B2B kurumsal e-posta)
  iletişiminde önceden onay şartı yok, ama (1) alıcı ret hakkını
  kullandığında bir daha iletişim kurulamaz, (2) kurumsal iletişim
  adreslerinin İYS'ye kaydı zorunlu. Bu ikincisi Prototip1 aşamasında
  tamamlanacak (bkz. yukarı), birincisi Mvp1'den itibaren teknik olarak
  zaten var.
- **WhatsApp:** Platform politikası (Meta), yerel hukuktan bağımsız olarak
  daha katı — business-initiated mesajlarda önceden onay + onaylı şablon
  şartı var, numaranın herkese açık olması bu şartı karşılamıyor.

## Maliyet stratejisi
- Serper API: ~$0.30–1 / 1000 sorgu, düşük hacimde önemsiz.
- AI: hacimli/basit işler (araştırma, puanlama) için ucuz model
  (Claude Haiku 4.5, $1/$5 per MTok); kalite kritik ve düşük hacimli olan
  e-posta taslağı adımında gerekirse daha güçlü modele geçilebilir.
- Her lead için token kullanımı loglanacak (ileride fiyatlandırma için
  gerçek maliyet verisi gerekiyor).

## Pazar / rekabet notu
- Global "AI SDR" kategorisi (Clay, Apollo, Instantly vb.) kalabalık ama
  Türkçe değil, Türkiye KOBİ bütçesine uygun değil, İYS/KVKK uyumu yok.
  Asıl rakip muhtemelen bu araçlar değil, çoğu KOBİ'nin hiç yapılandırılmış
  outbound satış yapmıyor olması — "daha iyi araç" değil "hiç yapılmayan bir
  şeyi erişilebilir kılma" konumlandırması.
- "İnsan onayı zorunlu" prensibi, tam otomasyona giden rakiplere karşı
  pazarlanabilir bir güven unsuru olarak kullanılabilir.

## TÜBİTAK BiGG notu (17 Eylül 2026 araştırması)
- Kişisel uygunluk: ön lisans/lisans/yüksek lisans/doktora mezunu veya
  öğrencisi olmak; **başvuru anında hiçbir şirketin ortağı olmamak**
  (şirket kurmadan ÖNCE başvurmak gerekiyor); önceden Teknogirişim/1512
  desteği almamış olmak; aynı dönemde tek fikirle başvuru.
- İçerik: iş fikrinin gerçek bir Ar-Ge/teknik yenilik içermesi bekleniyor -
  başvuru metninde "API'leri birleştiren wrapper" değil, kanıta dayalı
  puanlama metodolojisi ve doğrulanabilirlik yaklaşımı öne çıkarılmalı.
- Süreç: doğrudan TÜBİTAK'a değil, "BiGG Uygulayıcı Kuruluşları" (teknopark/
  üniversite TTO'ları) üzerinden. Bursa'da seçenekler: Bursa Uludağ Ü. TTO,
  Bursa Teknik Ü. TTO, "BİGG TEAM" (Anadolu Ü./Bursa Uludağ Ü./Eskişehir
  Osmangazi Ü./Eskişehir Teknik Ü. konsorsiyumu, ortakları arasında Tat
  Gıda da var).
- Destek miktarı kaynaklara göre değişiyor (900.000–1.350.000 TL aralığı,
  %3 hisse karşılığı yatırım modeline evrilmiş görünüyor) — kesin rakam
  için ilgili uygulayıcı kuruluşun güncel çağrı dokümanına bakılmalı.

## Teslim edilen dosyalar
- `salespilot-ai-layer/types.ts` — veri şemaları (araştırma, kanıta dayalı
  puan, lead, e-posta taslağı, İYS opt-out durumu).
- `salespilot-ai-layer/prompts.ts` — üç AI adımının prompt şablonları
  (araştırma çıkarımı, kanıta dayalı puanlama, e-posta taslağı).
- `salespilot-ai-layer/pipeline.ts` — Anthropic SDK ile çalışan örnek
  orkestrasyon kodu.
- `salespilot-ai-layer/README.md` — entegrasyon rehberi, maliyet ve İYS
  notları.

## Sıradaki adımlar
1. Mvp1'i `01-mvp1-yol-haritasi.md`'deki fazlara göre sıfırdan kurmak —
   Faz 0 (Next.js + Serper kurulumu) dahil, artık atlanacak bir adım değil.
2. Bu iş için Claude Code'a taşınması öneriliyor (sürekli geliştirme/deploy
   için bu sohbetten daha uygun bir ortam).
3. Mvp1 hazır olunca farklı sektörlerde 50+ adaylık taramalar ölçülecek.
4. Pazarlama/tasarım/satış planlaması için bu projede ayrı sohbetler
   açılacak.
