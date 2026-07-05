// /api/indexer.js
import axios from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/firebase.js'; // <-- TON BON CHEMIN

const URLS_ECOLE = [
  "https://www.harker.org/",
  "https://www.phillipsacademy.edu/",
  "https://www.stpaulsschool.org/"
];

function decouperEnChunks(texte, taille = 700) {
  const chunks = [];
  for (let i = 0; i < texte.length; i += taille) {
    chunks.push(texte.substring(i, i + taille));
  }
  return chunks;
}

function generateSchoolId(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_');
}

function detectDocType(text) {
  text = text.toLowerCase();
  if (text.includes('schedule') || text.includes('timetable')) return 'timetable';
  if (text.includes('course') || text.includes('curriculum')) return 'course';
  if (text.includes('announcement') || text.includes('news')) return 'announcement';
  return 'general';
}

function extractSubjects(text) {
  const matieres = ["Math", "Science", "English", "History", "Biology", "Chemistry", "Physics", "French"];
  return [...new Set(matieres.filter(m => text.toLowerCase().includes(m.toLowerCase())))];
}

async function crawlerSite(url) {
  try {
    console.log(`Crawling: ${url}`);
    const { data: html } = await axios.get(url, { 
      timeout: 15000, 
      headers: {'User-Agent': 'Mozilla/5.0 XAI-Bot 1.0'} 
    });
    const $ = cheerio.load(html);
    $('script, style, nav, footer, header').remove();
    const contenu = $('body').text().replace(/\s+/g, ' ').trim();
    const titre = $('title').text().trim() || url;
    return { url, titre, contenu };
  } catch (e) {
    console.error(`Echec Site: ${url}`, e.message);
    return null;
  }
}

async function saveSchoolIndex(schoolData) {
  console.log(`Sauvegarde: ${schoolData.school_name}`);
  await db.collection('school_index').doc(schoolData.school_id).set(schoolData);
  console.log(`OK: ${schoolData.school_id}`);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  console.log("=== DEBUT INDEXATION ===");
  let total = 0;

  for (const url of URLS_ECOLE) {
    const page = await crawlerSite(url);
    if (!page || page.contenu.length < 200) {
      console.log(`SKIP: ${url}`);
      continue;
    }

    const chunks = decouperEnChunks(page.contenu);
    const schoolId = generateSchoolId(page.titre);

    const schoolData = {
      type: "school_index",
      school_id: schoolId,
      school_name: page.titre,
      location: "USA",
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
      last_updated: new Date()
    };

    await saveSchoolIndex(schoolData);
    total++;
    await new Promise(r => setTimeout(r, 2000)); // 2s entre chaque
  }

  console.log(`=== INDEXATION TERMINEE: ${total} écoles ===`);
  return res.status(200).json({ succès: true, total_indexe: total });
}