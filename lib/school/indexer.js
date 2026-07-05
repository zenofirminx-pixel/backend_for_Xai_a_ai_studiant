import fetch from "node-fetch";
import * as cheerio from "cheerio";

export async function indexSchoolSite(url) {
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

    const data = {
      source: url,

      // 🧠 structure IA-friendly
      schoolInfo: {
        titles: [],
        announcements: [],
        content: []
      },

      // 📚 extras utiles pour ton IA scolaire
      scheduleHints: [],
      homeworkHints: [],
      links: [],

      indexedAt: new Date().toISOString()
    };

    // ======================
    // TITRES (structure école)
    // ======================
    $("h1, h2, h3").each((_, el) => {
      const text = $(el).text().trim();
      if (text) data.schoolInfo.titles.push(text);
    });

    // ======================
    // CONTENU (cours / infos)
    // ======================
    $("p").each((_, el) => {
      const text = $(el).text().trim();

      if (text.length > 25) {
        data.schoolInfo.content.push(text);

        // 🧠 détection simple emploi du temps / devoirs
        if (
          text.toLowerCase().includes("cours") ||
          text.toLowerCase().includes("emploi") ||
          text.toLowerCase().includes("horaire")
        ) {
          data.scheduleHints.push(text);
        }

        if (
          text.toLowerCase().includes("devoir") ||
          text.toLowerCase().includes("exercice")
        ) {
          data.homeworkHints.push(text);
        }
      }
    });

    // ======================
    // LIENS (PDF / annonces)
    // ======================
    $("a").each((_, el) => {
      const text = $(el).text().trim();
      let href = $(el).attr("href");

      if (href) {
        // rendre lien absolu si possible
        try {
          href = new URL(href, url).href;
        } catch (e) {}

        data.links.push({
          text,
          href
        });
      }
    });

    return data;

  } catch (err) {
    return {
      error: "Indexation échouée",
      details: err.message,
      source: url
    };
  }
}