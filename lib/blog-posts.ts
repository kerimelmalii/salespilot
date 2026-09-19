export type BlogSection = { heading: string; paragraphs: string[]; bullets?: string[] };

export type BlogPost = {
  slug: string;
  category: string;
  title: string;
  description: string;
  excerpt: string;
  readTime: string;
  publishedAt: string;
  sections: BlogSection[];
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "dogru-b2b-hedef-kitle-nasil-belirlenir",
    category: "Hedefleme",
    title: "Doğru B2B hedef kitle nasıl belirlenir?",
    description: "B2B hedef kitle belirlerken sektör, bölge, şirket türü, ihtiyaç ve alıcı rolünü birlikte değerlendirmek için uygulanabilir bir rehber.",
    excerpt: "Sektör, bölge ve ürün bilgisini gerçek bir alıcı profiline dönüştürmenin temel adımları.",
    readTime: "6 dk",
    publishedAt: "2026-09-19",
    sections: [
      { heading: "Sektör adı tek başına yeterli değildir", paragraphs: ["“Gıda şirketleri” veya “makine üreticileri” gibi geniş tanımlar, arama için bir başlangıçtır; satış hedefi değildir. Aynı sektörde yer alan şirketlerin ölçeği, üretim yapısı, satın alma ihtiyacı ve karar süreci birbirinden tamamen farklı olabilir.", "İyi bir hedef müşteri profili, şirketin ne yaptığını olduğu kadar neden sizin ürününüze ihtiyaç duyabileceğini de tarif eder."] },
      { heading: "Hedef profili beş soruyla daraltın", paragraphs: ["Aramaya başlamadan önce aşağıdaki sorulara açık cevap vermek, ilgisiz sonuçların büyük bölümünü daha en başta engeller."], bullets: ["Hangi sektörde ve alt sektörde faaliyet gösteriyor?", "Hangi şehirlerde veya ülkelerde bulunuyor?", "Üretici, distribütör, entegratör ya da son kullanıcı mı?", "Hangi ürün veya süreç nedeniyle çözümünüze ihtiyaç duyabilir?", "Satın alma ihtiyacını gösteren hangi kanıtlar aranmalı?"] },
      { heading: "Alıcı rolünü mutlaka doğrulayın", paragraphs: ["Arama sonuçlarında aynı kelimeleri kullanan satıcılar, rakipler ve firma rehberleri de görünür. Bu nedenle yalnızca anahtar kelime eşleşmesine güvenmek doğru değildir. Şirketin web sitesi, ürünleri, hizmet verdiği pazar ve kurumsal kimliği birlikte incelenmelidir.", "Sonuç olarak hedef kitle; uzun bir şirket listesi değil, ortak ihtiyacı ve satın alma ihtimali bulunan doğrulanmış şirketlerden oluşmalıdır."] },
    ],
  },
  {
    slug: "sirket-listesi-degil-satis-karari",
    category: "Satış zekâsı",
    title: "Şirket listesi değil, satış kararı",
    description: "B2B şirket listelerini kanıta dayalı, önceliklendirilmiş ve satış ekibinin harekete geçebileceği fırsatlara dönüştürme yaklaşımı.",
    excerpt: "Kalabalık aday listeleri yerine kanıta dayalı ve harekete geçirilebilir fırsatlar oluşturmak.",
    readTime: "5 dk",
    publishedAt: "2026-09-19",
    sections: [
      { heading: "Daha fazla şirket, daha fazla fırsat demek değildir", paragraphs: ["Yüzlerce şirket adı içeren bir dosya ilk bakışta değerli görünebilir. Ancak satış ekibi her kaydı tek tek araştırmak zorundaysa bu liste, zaman kazandırmak yerine yeni bir iş yükü üretir.", "Gerçek değer; şirketin hedefe neden uyduğunu, hangi bilginin doğrulandığını ve sıradaki aksiyonun ne olması gerektiğini gösterebilmektir."] },
      { heading: "Karar zemini hangi bilgileri içermeli?", paragraphs: ["Satışa hazır bir kayıt yalnızca isim, telefon ve web adresinden oluşmamalıdır."], bullets: ["Şirketin gerçek faaliyet alanı", "Ürün veya hizmetle kurduğu ihtiyaç ilişkisi", "Alıcı, satıcı ya da rakip olduğuna dair rol doğrulaması", "Puanın dayandığı kaynaklar ve gerekçeler", "Eksik veya belirsiz kalan bilgiler"] },
      { heading: "Önceliklendirme ekibin odağını korur", paragraphs: ["Kanıta dayalı puanlama, bütün şirketleri aynı kefeye koymak yerine en güçlü eşleşmeleri öne çıkarır. Düşük güvenli sonuçları ayrıca işaretlemek, yanlış kesinlik üretmeden insan kontrolünü doğru noktaya taşır.", "Böylece ekip araştırma yapmakla değil; doğru şirketle doğru mesaj üzerinden iletişim kurmakla zaman geçirir."] },
    ],
  },
  {
    slug: "lead-puani-ne-zaman-guvenilirdir",
    category: "Yapay zekâ",
    title: "Lead puanı ne zaman güvenilirdir?",
    description: "Lead scoring sistemlerinde güvenilir puanlama için açık kriterler, doğrulanabilir kaynaklar, belirsizlik yönetimi ve insan kontrolü.",
    excerpt: "Bir puanın arkasında hangi verilerin, kontrollerin ve insan değerlendirmesinin bulunması gerekir?",
    readTime: "7 dk",
    publishedAt: "2026-09-19",
    sections: [
      { heading: "Puan tek başına bir cevap değildir", paragraphs: ["Bir şirkete 91 puan vermek, bu puanın nasıl oluştuğu görünmüyorsa satış ekibi için sınırlı bir anlam taşır. Güvenilir lead scoring; sonucu değil, sonuca giden gerekçeyi de göstermelidir.", "Sektör uyumu, bölge, ürün ihtiyacı ve özel kriterler ayrı ayrı değerlendirildiğinde puan incelenebilir ve karşılaştırılabilir hâle gelir."] },
      { heading: "Kanıt yoksa yüksek puan da olmamalı", paragraphs: ["Yapay zekâ, eksik bilgiyi tahminle tamamladığında ikna edici fakat yanlış sonuçlar üretebilir. Bu nedenle yüksek puanların kurumsal web sitesi, ürün sayfası veya güvenilir şirket kaydı gibi doğrulanabilir kaynaklarla desteklenmesi gerekir."], bullets: ["Her kriter için ayrı gerekçe", "Kaynağa bağlanan doğrulanabilir bulgu", "Çelişkili bilgiler için güven uyarısı", "Yetersiz veride ‘araştırma gerekli’ sonucu", "İletişim öncesinde insan onayı"] },
      { heading: "Amaç otomatik karar değil, daha iyi karardır", paragraphs: ["İyi bir puanlama sistemi satışçının yerine karar vermeye çalışmaz. Araştırmayı hızlandırır, gürültüyü azaltır ve insanın dikkatini gerçekten değerlendirilmesi gereken şirketlere yönlendirir.", "Güvenilirlik; yüksek puan vermekten değil, belirsizliği de açıkça göstermekten gelir."] },
    ],
  },
];

export function getBlogPost(slug: string) {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
