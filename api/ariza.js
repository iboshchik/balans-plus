/**
 * Balans Plus — Ariza qabul qilish serverless funksiyasi
 *
 * POST so'rovlarini qabul qilib, Telegram botga yuboradi.
 * Tashqi kutubxonalarsiz — faqat Node.js fetch.
 */

// ⬇️ O'zingizning Telegram bot ma'lumotlaringizni shu yerga kiriting:
// Muhit o'zgaruvchilaridan olish (xavfsiz usul)
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID   = process.env.CHAT_ID;

export default async function handler(req, res) {
  // ── 1. Faqat POST metodini qabul qilish ──
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Faqat POST so'rovlari qabul qilinadi.",
    });
  }

  // ── 2. So'rov tanasidan maydonlarni olish ──
  const { name, phone, service, message, honeypot } = req.body ?? {};

  // ── 3a. Honeypot tekshiruvi (spam bot uchun jimgina 200 qaytarish) ──
  if (honeypot) {
    return res.status(200).json({ success: true });
  }

  // ── 3b. Telegram bot ma'lumotlarini tekshirish ──
  if (!BOT_TOKEN || BOT_TOKEN === "YOUR_BOT_TOKEN_HERE") {
    return res.status(500).json({
      success: false,
      error: "Server xatosi: BOT_TOKEN kiritilmagan. api/ariza.js faylini tahrirlang.",
    });
  }

  if (!CHAT_ID || CHAT_ID === "YOUR_CHAT_ID_HERE") {
    return res.status(500).json({
      success: false,
      error: "Server xatosi: CHAT_ID kiritilmagan. api/ariza.js faylini tahrirlang.",
    });
  }

  // ── 4. Validatsiya ──
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({
      success: false,
      error: "Ism kamida 2 ta belgidan iborat bo'lishi kerak.",
    });
  }

  const phoneDigits = (phone ?? "").replace(/\D/g, "");
  if (!phone || phoneDigits.length < 9 || phoneDigits.length > 15) {
    return res.status(400).json({
      success: false,
      error: "Telefon raqami noto'g'ri formatda kiritilgan.",
    });
  }

  // ── 5. Telegram xabarini shakllantirish va yuborish ──
  const escapeHtml = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const text = [
    "📩 <b>Yangi ariza (Balans Plus)</b>",
    "",
    `👤 <b>Ism:</b> ${escapeHtml(name.trim())}`,
    `📞 <b>Telefon:</b> ${escapeHtml(phone.trim())}`,
    `📋 <b>Xizmat:</b> ${escapeHtml(service?.trim() || "—")}`,
    `💬 <b>Izoh:</b> ${escapeHtml(message?.trim() || "—")}`,
  ].join("\n");

  const telegramURL = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(telegramURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      console.error("Telegram API xatosi:", data);
      const desc = data?.description || "Xatolik yuz berdi";
      return res.status(502).json({
        success: false,
        error: `Telegram xatosi: ${desc}`,
      });
    }

    // ── 6. Muvaffaqiyatli javob ──
    return res.status(200).json({
      success: true,
      message: "Arizangiz muvaffaqiyatli yuborildi!",
    });
  } catch (err) {
    console.error("Telegram ga ulanishda xatolik:", err);
    return res.status(502).json({
      success: false,
      error: "Telegram serveriga ulanib bo'lmadi. Keyinroq urinib ko'ring.",
    });
  }
}
