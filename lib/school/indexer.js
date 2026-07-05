import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { saveSchoolData } from "../school/storage.js";

const DEFAULT_URL = "https://mapcarta.com/fr/N759214401"; 
// ⚠️ fallback basé sur ce qu’on a trouvé pour Sainte Christine

export async function indexSchoolSite(url = DEFAULT_URL) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { error: "Fetch failed", status: res.status, source: url };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const data = {
      source: url,
      schoolName: "Collège Sainte-Christine (Makala / Ngaba)",
      titles: [],
      content: [],
      links: [],
      indexedAt: new Date().toISOString()
    };

    $("h1, h2, h3").each((_, el) => {
      const text = $(el).text().trim();
      if (text) data.titles.push(text);
    });

    $("p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) data.content.push(text);
    });

    $("a").each((_, el) => {
      const text = $(el).text().trim();
      let href = $(el).attr("href");

      if (href) {
        try {
          href = new URL(href, url).href;
        } catch {}
        data.links.push({ text, href });
      }
    });

    // 🔥 IMPORTANT : stockage Firebase via storage.js
    await saveSchoolData(data);

    return data;

  } catch (err) {
    return {
      error: "Indexation échouée",
      details: err.message,
      source: url
    };
  }
}