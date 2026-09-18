import nodemailer from "nodemailer";

/**
 * SalesPilot - E-posta Gönderim Modülü
 *
 * TEST MODU (varsayılan açık): Gerçek şirketlere yanlışlıkla mail
 * atılmasını önlemek için, TEST_EMAIL_MODE ortam değişkeni "true" olduğu
 * sürece TÜM göndermeler gerçek alıcı yerine TEST_EMAIL_RECIPIENT'e gider.
 * Mailin başına gerçek alıcının kim olacağını gösteren bir uyarı eklenir.
 *
 * Pilot şirketlere gerçekten mail atmaya hazır olduğunuzda .env.local'de
 * TEST_EMAIL_MODE=false yapın - başka hiçbir kod değişikliği gerekmez.
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  sentTo: string; // gerçekte gönderilen adres (test modunda test adresi)
  intendedRecipient: string; // asıl hedeflenen adres
  testMode: boolean;
  sentAt: string;
}

function isTestMode(): boolean {
  // Güvenli varsayılan: TEST_EMAIL_MODE açıkça "false" yazılmadığı sürece
  // test modu AÇIK sayılır. Yanlışlıkla gerçek gönderim yapılmasındansa
  // yanlışlıkla test modunda kalmak çok daha güvenli bir hata.
  return process.env.TEST_EMAIL_MODE !== "false";
}

function buildTransport() {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  if (!user || !appPassword) {
    throw new Error(
      "GMAIL_USER ve GMAIL_APP_PASSWORD tanımlı değil. .env.local dosyasını kontrol edin."
    );
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: appPassword },
  });
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const testMode = isTestMode();
  const transport = buildTransport();

  let actualTo = params.to;
  let actualSubject = params.subject;
  let actualBody = params.body;

  if (testMode) {
    const testRecipient = process.env.TEST_EMAIL_RECIPIENT;
    if (!testRecipient) {
      throw new Error(
        "Test modu açık ama TEST_EMAIL_RECIPIENT tanımlı değil. .env.local dosyasını kontrol edin."
      );
    }
    actualTo = testRecipient;
    actualSubject = `[TEST] ${params.subject}`;
    actualBody = `⚠️ TEST MODU — Bu mail gerçek gönderilseydi şu adrese giderdi: ${params.to}\n\n---\n\n${params.body}`;
  }

  await transport.sendMail({
    from: process.env.GMAIL_USER,
    to: actualTo,
    subject: actualSubject,
    text: actualBody,
  });

  return {
    sentTo: actualTo,
    intendedRecipient: params.to,
    testMode,
    sentAt: new Date().toISOString(),
  };
}
