import fetch from "node-fetch";
import * as cheerio from "cheerio";

export async function indexSchoolSite(url) {
  try {
    const res = await fetch(url);
    const html = await res.text();

    const $ = cheerio.load(html);

    // 🔎 exemple extraction simple
    const titles = [];
    $("h1, h2, h3").each((i, el) => {
      titles.push($(el).text().trim());
    });

    const paragraphs = [];
    $("p").each((i, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) paragraphs.push(text);
    });

    return {
      source: url,
      titles,
      paragraphs,
      indexedAt: new Date().toISOString()
    };

  } catch (err) {
    return {
      error: "Indexation échouée",
      details: err.message
    };
  }
}