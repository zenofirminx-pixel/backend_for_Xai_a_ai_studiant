// /api/indexer.js
import axios from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/firebase.js'; // <-- CHEMIN CORRECT
import { deleteOldSchoolData } from '../lib/delete/xai_delete.js';

const URLS_ECOLE = [
  "https://www.harker.org/"
];

async function crawlerSite(url) {
  const { data: html } = await axios.get(url, { timeout: 10000, headers: {'User-Agent': 'Mozilla/5.0'} });
  const $ = cheerio.load(html);
  $('script, style, nav, footer').remove();
  return {
    url,
    titre: $('title').text().trim(),
    contenu: $('body').text().replace(/\s+/g, ' ').trim()
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  console.log("=== DEBUT INDEXER ===");

  try {
    await deleteOldSchoolData().catch(e => console.log("Delete skip:", e.message));

    const url = URLS_ECOLE[0];
    const page = await crawlerSite(url);
    const schoolId = page.titre.toLowerCase().replace(/\s+/g, '_');

    await db.collection('school_index').doc(schoolId).set({
      type: "school_index",
      school_id: schoolId,
      school_name: page.titre,
      location: "USA",
      source_urls: [page.url],
      documents: [{
        doc_id: uuidv4(),
        content: page.contenu.substring(0, 500),
        raw_text_chunks: [page.contenu.substring(0, 700)],
        type: "general"
      }],
      last_updated: new Date()
    });

    console.log("=== ENREGISTRE: ", page.titre);
    return res.status(200).json({ succès: true, ecole: page.titre });

  } catch (e) {
    console.error("ERREUR:", e);
    return res.status(500).json({ erreur: e.message });
  }
}