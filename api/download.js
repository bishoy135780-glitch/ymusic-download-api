import ytdl from "@distube/ytdl-core";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function fail(res, status, message) {
  cors(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({ error: message }));
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== "GET") return fail(res, 405, "استخدم GET فقط");

  const raw = req.query?.url || new URL(req.url, "http://localhost").searchParams.get("url");
  const source = typeof raw === "string" ? raw.trim() : "";
  if (!source) return fail(res, 400, "ضع رابط فيديو YouTube في ?url=");
  if (!ytdl.validateURL(source)) return fail(res, 400, "رابط YouTube غير صحيح");

  try {
    const info = await ytdl.getInfo(source);
    const title = (info.videoDetails.title || "ymusic")
      .replace(/[\\/:*?"<>|\n\r]+/g, " ")
      .trim().slice(0, 120) || "ymusic";
    const audio = ytdl.chooseFormat(info.formats, { quality: "highestaudio", filter: "audioonly" });
    if (!audio?.url) return fail(res, 404, "لا يوجد مسار صوتي متاح لهذا الفيديو");

    res.statusCode = 200;
    res.setHeader("Content-Type", audio.mimeType?.split(";")[0] || "audio/mp4");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(title)}.m4a`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-YMusic-Title", encodeURIComponent(title));
    ytdl.downloadFromInfo(info, { format: audio })
      .on("error", error => {
        console.error("[download-stream]", error);
        if (!res.writableEnded) res.end();
      }).pipe(res);
  } catch (error) {
    console.error("[download]", error);
    if (!res.headersSent) return fail(res, 502, "تعذر جلب الصوت من YouTube");
    res.end();
  }
}
