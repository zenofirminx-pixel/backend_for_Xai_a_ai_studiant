// /api/indexer.js
import axios from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/firebase/firebase.js'; // <-- VOILA LE BON CHEMIN

const URLS_ECOLE = [
  "https://www.layicongolesecole.org/",
  "https://www.bosangani.org/",
  "https://www.tata-rafiki.org/"
];

function decouperEnChunks(texte, taille = 700) {
  const chunks = [];
  for (let i = 0; i < texte.length; i += taille) {
    chunks.push(texte.substring(i, i + taille));
  }
  return chunks;
}

function detectCategorie(texte) {
  texte = texte.toLowerCase();
  if (texte.includes('horaire') || texte.includes('emploi du temps')) return 'horaire';
  if (texte.includes('frais') || texte.includes('scolarité') || texte.includes('prix')) return 'frais';
  if (texte.includes('contact') || texte.includes('adresse') || texte.includes('téléphone')) return 'contact';
  if (texte.includes('admission') || texte.includes('inscription')) return 'admission';
  return 'general';
}

async function crawlerSite(url) {
  try {
    console.log(`Crawling: ${url}`);
    const { data: html } = await axios.get(url, { timeout: 15000, headers: {'User-Agent': 'Mozilla/5.0 XAI-Bot'} });
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

async function saveSchoolChunksBatch(chunks) {
  const batch = db.batch();
  const colRef = db.collection('pages_ecole');
  chunks.forEach(c => batch.set(colRef.doc(c.id), c));
  await batch.commit();
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  console.log("Début indexation écoles Congo...\n");
  let totalChunks = 0;

  for (const url of URLS_ECOLE) {
    const page = await crawlerSite(url);
    if (!page || !page.contenu) continue;

    const chunks = decouperEnChunks(page.contenu);
    const chunksToSave = chunks.map((chunk, i) => ({
      id: uuidv4(),
      url: page.url,
      domaine: new URL(page.url).hostname,
      titre: page.titre,
      chunk: chunk,
      chunk_index: i,
      total_chunks: chunks.length,
      resume_auto: chunk.substring(0, 200) + "...",
      mots_cles: [...new Set(chunk.toLowerCase().match(/\w{4,}/g) || [])].slice(0, 20),
      source: "CSC_Ngaba",
      type: "ecole",
      categorie: detectCategorie(chunk),
      pays: "CD",
      ville: "Kinshasa",
      date_indexation: new Date(),
      statut: "actif"
    }));

    await saveSchoolChunksBatch(chunksToSave);
    totalChunks += chunks.length;
    console.log(`${chunks.length} chunks sauvés pour: ${page.titre}`);
    await new Promise(r => setTimeout(r, 2000));
  }

  return res.status(200).json({ success: true, total: totalChunks });
}