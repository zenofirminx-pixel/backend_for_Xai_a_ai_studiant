// /lib/school/indexer.js
const axios = require('axios');
const cheerio = require('cheerio');
const { saveSchoolChunksBatch } = require('./storage'); // <-- on importe la fonction, pas db
const { v4: uuidv4 } = require('uuid');

const URLS_ECOLE = [
 "https://www.layicongolesecole.org/", // Lycée Américain de Kinshasa - a un vrai site
  "https://www.bosangani.org/", // École Belge de Kinshasa - a un vrai site avec actualités
  "https://www.tata-rafiki.org/", // Complexe Scolaire Tata Rafiki
  "https://fr.wikipedia.org/wiki/Intelligence_artificielle",
  "https://fr.wikipedia.org/wiki/Python_(langage)",
  "https://fr.wikipedia.org/wiki/Termux",
  "https://fr.wikipedia.org/wiki/Firebase",
  "https://fr.wikipedia.org/wiki/Robotique",
  "https://fr.wikipedia.org/wiki/Algorithmie",
  "https://fr.wikipedia.org/wiki/Base_de_donn%C3%A9es",
  "https://fr.wikipedia.org/wiki/Internet",
  "https://fr.wikipedia.org/wiki/Machine_learning",
  "https://fr.wikipedia.org/wiki/R%C3%A9seau_informatique",
  "https://fr.wikipedia.org/wiki/Syst%C3%A8me_d%27exploitation",
  "https://fr.wikipedia.org/wiki/Programmation",
  "https://fr.wikipedia.org/wiki/Data_science",
  "https://fr.wikipedia.org/wiki/API",
  "https://fr.wikipedia.org/wiki/Cloud_computing"

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