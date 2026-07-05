import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { saveSchoolData } from "../school/storage.js";

const DEFAULT_URL = "https://mapcarta.com/fr/N759214401";

export async function indexSchoolSite(url = DEFAULT_URL) {
  try {
    const res = await fetch(url);

    if (!res.ok) {
      return {
        error: "Fetch failed",
        status: res.status,
        source: url
      };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    // 🧠 STRUCTURE PROPRE POUR FIRESTORE
    const data = {
      meta: {
        schoolId: "sainte_christine",
        schoolName: "Collège Sainte-Christine (Makala / Ngaba)",
        source: url,
        indexedAt: new Date().toISOString()
      },

      content: {
        titles: [],
        paragraphs: [],
        links: []
      }
    };

    // ================= TITRES =================
    $("h1,h2,h3").each((_, el) => {
      const text = $(el).text().trim();
      if (text) data.content.titles.push(text);
    });

    // ================= CONTENU =================
    $("p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) {
        data.content.paragraphs.push(text);
      }
    });

    // ================= LIENS =================
    $("a").each((_, el) => {
      const text = $(el).text().trim();
      let href = $(el).attr("href");

      if (href) {
        try {
          href = new URL(href, url).href;
        } catch {}

        data.content.links.push({
          text,
          href
        });
      }
    });

    // 🔥 FIRESTORE SAVE (STRUCTURÉ)
    await saveSchoolData(data.meta.schoolId, data);

    return data;

  } catch (err) {
    return {
      error: "Indexation échouée",
      details: err.message,
      source: url
    };
  }
}