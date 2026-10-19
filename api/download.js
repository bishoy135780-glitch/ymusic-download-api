import { Readable } from "node:stream";

const PIPED_APIS = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.leptons.xyz",
  "https://pipedapi.nosebs.ru",
  "https://pipedapi.adminforge.de",
  "https://api.piped.yt",
  "https://pipedapi.drgns.space",
];

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
  const id = source.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/)?.[1];
  if (!id) return fail(res, 400, "رابط YouTube غير صحيح");

  try {
    let streamInfo;
    let lastError;
    for (const api of PIPED_APIS) {
      try {
        const response = await fetch(`${api}/streams/${id}`, { signal: AbortSignal.timeout(12_000) });
        if (!response.ok) throw new Error(`${api} returned ${response.status}`);
        const data = await response.json();
        const audio = (data.audioStreams || [])
          .filter(item => item?.url && !item.videoOnly)
          .sort((a, b) => Number(b.bitrate || 0) - Number(a.bitrate || 0))[0];
        if (!audio) throw new Error("no audio stream");
        streamInfo = { audio, title: data.title || "ymusic" };
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!streamInfo) throw lastError || new Error("No public audio instance available");

    const audioResponse = await fetch(streamInfo.audio.url, { signal: AbortSignal.timeout(30_000) });
    if (!audioResponse.ok || !audioResponse.body) throw new Error("Audio proxy failed");
    const title = String(streamInfo.title).replace(/[\\/:*?"<>|\n\r]+/g, " ").trim().slice(0, 120) || "ymusic";
    res.statusCode = 200;
    res.setHeader("Content-Type", streamInfo.audio.mimeType || "audio/mp4");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(title)}.m4a`);
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-YMusic-Title", encodeURIComponent(title));
    Readable.fromWeb(audioResponse.body).pipe(res);
  } catch (error) {
    console.error("[download]", error);
    if (!res.headersSent) return fail(res, 502, "تعذر جلب الصوت من YouTube");
    res.end();
  }
}
