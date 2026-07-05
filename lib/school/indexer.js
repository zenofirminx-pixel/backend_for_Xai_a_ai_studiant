// /lib/school/indexer.js
const axios = require('axios');
const cheerio = require('cheerio');
const { saveSchoolChunksBatch } = require('./storage'); // <-- on importe la fonction, pas db
const { v4: uuidv4 } = require('uuid');

const URLS_ECOLE = [
  "https://www.facebook.com/CSCNGABA", // Sainte Christine Ngaba
  "https://www.layicongolesecole.org/", // Pour test
];

function decouperEnChunks(texte, taille = 700) {
  const chunks = [];
  for (let i = 0; i < texte.length; i += taille) {
    chunks.push(texte.substring(i, i + taille));
  }
  return chunks;
}

function detecterType(titre, contenu) {
  const text = (titre + " + contenu).toLowerCase();
  if (text.includes("emploi") || text.includes("horaire")) return "emploi_du_temps";
  if (text.includes("devoir") || text.includes("exercice")) return "devoir";
  if (text.includes("annonce") || text.includes("info")) return "annonce";
  return "info_generale";
}

async function crawler(url) {
  try {
    console.log(`Crawling: ${url}`);
    const { data } = await axios.get(url, { 
      headers: { 'User-Agent': 'XAI-Bot/1.0' },
      timeout: 20000
    });
    const $ = cheerio.load(data);
    
    let titre = "Annonce Ecole";
    let contenu = "";

    if (url.includes("facebook.com")) {
      titre = $('title').text().trim();
      contenu = $('div[data-pagelet="FeedUnit_0"] span, div[role="article"] div').text().slice(0, 4000);
    } else {
      titre = $('h1, .page-title').first().text().trim();
      contenu = $('main, .content, article').text().replace(/\s+/g, ' ').trim();
    }

    return { url, titre, contenu };
  } catch (e) {
    console.log(`Echec: ${url} -> ${e.message}`);
    return null;
  }
}

async function runIndexer() {
  console.log("Début indexation écoles Congo...\n");
  
  for (const url of URLS_ECOLE) {
    const page = await crawler(url);
    if (!page || !page.contenu || page.contenu.length < 50) continue;

    const chunks = decouperEnChunks(page.contenu);
    const source = url.includes("facebook.com") ? "CSC_Ngaba" : "LAYI";
    const type = detecterType(page.titre, page.contenu);

    // On prépare tous les chunks pour le batch
    const chunksToSave = chunks.map(chunk => ({
      id: uuidv4(),
      url: page.url,
      titre: page.titre,
      chunk: chunk,
      mots_cles: [...new Set(chunk.toLowerCase().match(/\w{4,}/g) || [])].slice(0, 20),
      source: source,
      type: type
    }));

    await saveSchoolChunksBatch(chunksToSave); // <-- IL ENVOIE A STORAGE.JS
    console.log(`${chunks.length} chunks sauvés pour: ${page.titre}`);
    await new Promise(r => setTimeout(r, 3000));
  }
  
  console.log("\nIndexation terminée !");
}

runIndexer();