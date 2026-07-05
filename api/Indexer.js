// /api/indexer.js
import axios from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { saveSchoolChunksBatch } from '../lib/school/storage'; 

const URLS_ECOLE = [
  "https://www.layicongolesecole.org/",
  "https://www.bosangani.org/",
  "https://www.tata-rafiki.org/",
  "https://fr.wikipedia.org/wiki/Intelligence_artificielle",
  "https://fr.wikipedia.org/wiki/Python_(langage)"
  // ... garde que 5 pour tester d'abord
];

function decouperEnChunks(texte, taille = 700) {
  const chunks = [];
  for (let i = 0; i < texte.length; i += taille) {
    chunks.push(texte.substring(i, i + taille));
  }
  return chunks;
}

async function crawlerSite(url) {
  try {
    console.log(`Crawling: ${url}`);
    const { data: html } = await axios.get(url, { timeout: 15000, headers: {'User-Agent': 'Mozilla/5.0'} });
    const $ = cheerio.load(html);
    $('script, style, nav, footer, header').remove();
    const contenu = $('body').text().replace(/\s+/g, ' ').trim();
    const titre = $('title').text() || url;
    return { url, titre, contenu };
  } catch (e) {
    console.error(`Echec Site: ${url}`, e.message);
    return null;
  }
}

async function crawlerPDF(url) {
  try {
    const pdf = (await import('pdf-parse')).default; // import dynamique pour éviter crash vercel
    console.log(`Crawling PDF: ${url}`);
    const { data } = await axios.get(url, { responseType: 'arraybuffer' });
    const pdfData = await pdf(data);
    return { url, titre: "Emploi du temps PDF", contenu: pdfData.text };
  } catch (e) {
    console.log(`Echec PDF: ${e.message}`);
    return null;
  }
}

// FONCTION POUR LES CORS
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);

  // Répond au preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log("Début indexation écoles Congo...\n");
  let totalChunks = 0;

  for (const url of URLS_ECOLE) {
    let page = null;
    if (url.includes(".pdf") || url.includes("drive.google.com")) {
      page = await crawlerPDF(url);
    } else {
      page = await crawlerSite(url);
    }

    if (!page || !page.contenu) continue;

    const chunks = decouperEnChunks(page.contenu);
    const chunksToSave = chunks.map(chunk => ({
      id: uuidv4(),
      url: page.url,
      titre: page.titre,
      chunk: chunk,
      mots_cles: [...new Set(chunk.toLowerCase().match(/\w{4,}/g) || [])].slice(0, 20),
      source: "CSC_Ngaba",
      type: "emploi_du_temps",
      date_indexation: new Date()
    }));

    await saveSchoolChunksBatch(chunksToSave);
    totalChunks += chunks.length;
    console.log(`${chunks.length} chunks sauvés pour: ${page.titre}`);
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\nIndexation terminée! Total: ${totalChunks} chunks`);
  return res.status(200).json({ success: true, total: totalChunks });
}