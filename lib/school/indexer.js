// /lib/school/indexer.js
const axios = require('axios');
const cheerio = require('cheerio');
const pdf = require('pdf-parse'); // npm i pdf-parse
const { saveSchoolChunksBatch } = require('./storage');
const { v4: uuidv4 } = require('uuid');

const URLS_ECOLE = [
  // SITES WEB
  "https://www.layicongolesecole.org/",
  "https://www.bosangani.org/",

  // PDF EXEMPLE - tu remplaces par le lien Drive de Sainte Christine quand tu l'as
  // "https://drive.google.com/uc?export=download&id=FILE_ID",
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

function decouperEnChunks(texte, taille = 700) { /*... pareil... */ }

async function crawlerSite(url) { /*... code site normal... */ }

async function crawlerPDF(url) {
  try {
    console.log(`Crawling PDF: ${url}`);
    const { data } = await axios.get(url, { responseType: 'arraybuffer' });
    const pdfData = await pdf(data);
    return {
      url,
      titre: "Emploi du temps PDF",
      contenu: pdfData.text
    };
  } catch (e) {
    console.log(`Echec PDF: ${e.message}`);
    return null;
  }
}

async function runIndexer() {
  console.log("Début indexation écoles Congo...\n");

  for (const url of URLS_ECOLE) {
    let page = null;
    if (url.includes(".pdf") || url.includes("drive.google.com")) {
      page = await crawlerPDF(url);
    } else {
      page = await crawlerSite(url);
    }

    if (!page ||!page.contenu) continue;

    const chunks = decouperEnChunks(page.contenu);
    const chunksToSave = chunks.map(chunk => ({
      id: uuidv4(),
      url: page.url,
      titre: page.titre,
      chunk: chunk,
      mots_cles: [...new Set(chunk.toLowerCase().match(/\w{4,}/g) || [])].slice(0, 20),
      source: "CSC_Ngaba",
      type: "emploi_du_temps"
    }));

    await saveSchoolChunksBatch(chunksToSave);
    console.log(`${chunks.length} chunks sauvés pour: ${page.titre}`);
  }

  console.log("\nIndexation terminée!");
}

runIndexer();