import fetch from "node-fetch";
import * as cheerio from "cheerio";

export async function indexSchoolSite(url) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    const data = {
      source: url,
      titles: [],
      announcements: [],
      content: [],
      indexedAt: new Date().toISOString()
    };

    // titres
    $("h1, h2, h3").each((_, el) => {
      const text = $(el).text().trim();
      if (text) data.titles.push(text);
    });

    // paragraphs filtrés (important)
    $("p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 25) data.content.push(text);
    });

    // extra: liens utiles (souvent emploi du temps / PDF)
    $("a").each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href");
      if (href && text) {
        data.announcements.push({ text, href });
      }
    });

    return data;

  } catch (err) {
    return {
      error: "Indexation échouée",
      details: err.message
    };
  }
}