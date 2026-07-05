// /api/indexer.js
import axios from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/firebase.js'; // <-- TON CHEMIN
import { deleteOldSchoolData } from '../lib/xai_delete.js'; // <-- on importe le delete

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

function generateSchoolId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

function detectDocType(text) {
  text = text.toLowerCase();
  if (text.includes('horaire') || text.includes('emploi du temps')) return 'timetable';
  if (text.includes('exercice') || text.includes('cours') || text.includes('chapitre')) return 'course';
  if (text.includes('réunion') || text.includes('annonce')) return 'announcement';
  return 'general';
}

function extractSubjects(text) {
  const matieres = ["Math", "Français", "Physique", "Biologie", "Chimie", "Histoire", "Géographie", "Anglais"];
  return [...new Set(matieres.filter(m => text.toLowerCase().includes(m.toLowerCase())))];
}

async function crawlerSite(url) {
  try {
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

async function saveSchoolIndex(schoolData) {
  await db.collection('school_index').doc(schoolData.school_id).set(schoolData);
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  console.log("=== DEBUT INDEXATION INTELLIGENTE ===");
  
  // ETAPE 1: Supprimer les anciennes données de +24h
  console.log("1. Suppression des anciennes données...");
  const deleted = await deleteOldSchoolData();
  console.log(`${deleted} anciennes écoles supprimées`);

  // ETAPE 2: Lancer nouveau index
  console.log("2. Lancement nouveau index...");
  let total = 0;

  for (const url of URLS_ECOLE) {
    const page = await crawlerSite(url);
    if (!page || !page.contenu) continue;

    const chunks = decouperEnChunks(page.contenu);
    const schoolId = generateSchoolId(page.titre);

    const schoolData = {
      type: "school_index",
      school_id: schoolId,
      school_name: page.titre,
      location: "Kinshasa, CD",
      source_urls: [page.url],
      documents: [{
        doc_id: uuidv4(),
        title: page.titre,
        category: detectDocType(page.contenu),
        content: page.contenu.substring(0, 1000),
        raw_text_chunks: chunks,
        keywords: [...new Set(page.contenu.toLowerCase().match(/\w{4,}/g) || [])].slice(0, 30),
        type: detectDocType(page.contenu)
      }],
      subjects: extractSubjects(page.contenu),
      last_updated: new Date() // <-- IMPORTANT pour le delete
    };

    await saveSchoolIndex(schoolData);
    total++;
    console.log(`Ecole indexée: ${page.titre}`);
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log("=== INDEXATION TERMINEE ===");
  return res.status(200).json({ succès: true, total_indexe: total, total_supprime: deleted });
}