// Telegram webhook: botga yozilgan matn/rasmni Supabase'ga saqlaydi.
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = Number(process.env.ADMIN_ID);
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

const sbHeaders = (extra = {}) => ({
  apikey: SB_KEY,
  Authorization: "Bearer " + SB_KEY,
  ...extra,
});

async function reply(chatId, text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function uploadPhoto(fileId) {
  const info = await (
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`)
  ).json();
  if (!info.ok) throw new Error("getFile xatosi");

  const filePath = info.result.file_path;
  const img = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
  const buffer = Buffer.from(await img.arrayBuffer());

  const ext = (filePath.split(".").pop() || "jpg").toLowerCase();
  const name = `${Date.now()}.${ext}`;
  const up = await fetch(`${SB_URL}/storage/v1/object/images/${name}`, {
    method: "POST",
    headers: sbHeaders({ "Content-Type": ext === "png" ? "image/png" : "image/jpeg" }),
    body: buffer,
  });
  if (!up.ok) throw new Error("Rasm yuklanmadi: " + (await up.text()));
  return `${SB_URL}/storage/v1/object/public/images/${name}`;
}

exports.handler = async (event) => {
  try {
    const update = JSON.parse(event.body || "{}");
    const msg = update.message;
    if (!msg || !msg.from) return { statusCode: 200, body: "ok" };

    // Faqat admin yoza oladi
    if (msg.from.id !== ADMIN_ID) {
      await reply(msg.chat.id, "Sizda ruxsat yo'q.");
      return { statusCode: 200, body: "ok" };
    }

    if (msg.text === "/start") {
      await reply(msg.chat.id, "Matn yoki rasm yuboring, saytda paydo bo'ladi.");
      return { statusCode: 200, body: "ok" };
    }

    const text = msg.text || msg.caption || "";
    let imageUrl = null;
    if (msg.photo && msg.photo.length) {
      // Eng katta o'lchamdagi rasm oxirgisi bo'ladi
      imageUrl = await uploadPhoto(msg.photo[msg.photo.length - 1].file_id);
    }

    if (!text && !imageUrl) {
      await reply(msg.chat.id, "Faqat matn yoki rasm yuboring.");
      return { statusCode: 200, body: "ok" };
    }

    const res = await fetch(`${SB_URL}/rest/v1/posts`, {
      method: "POST",
      headers: sbHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ text, image_url: imageUrl }),
    });
    if (!res.ok) throw new Error("Bazaga yozilmadi: " + (await res.text()));

    await reply(msg.chat.id, "Saytga qo'shildi ✅");
  } catch (e) {
    console.error(e);
  }
  return { statusCode: 200, body: "ok" };
};
