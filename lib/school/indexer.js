// /lib/school/indexer.js
const axios = require('axios');
const cheerio = require('cheerio');
const { db } = require('./storage'); 
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
      // Pour Facebook - on prend les posts publics
      titre = $('title').text().trim();
      contenu = $('div[data-pagelet="FeedUnit_0"] span').text().slice(0, 3000); // posts
    } else {
      // Pour site web normal
      titre = $('h1, .page-title').first().text().trim();
      contenu = $('main, .content, body').text().replace(/\s+/g, ' ').trim();
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
    if (!page || !page.contenu) continue;

    const chunks = decouperEnChunks(page.contenu);
    const batch = db.batch();

    chunks.forEach((chunk, i) => {
      const docRef = db.collection('pages_ecole').doc(`${uuidv4()}`);
      batch.set(docRef, {
        url: page.url,
        titre: page.titre,
        chunk: chunk,
        mots_cles: [...new Set(chunk.toLowerCase().match(/\w{4,}/g))].slice(0, 20),
        source: "CSC_Ngaba", // change selon l'école
        type: "annonce", // annonce, emploi_du_temps, devoir
        date_indexation: new Date().toISOString()
      });
    });
    await batch.commit();
    console.log(`${chunks.length} chunks sauvés pour: ${page.titre}`);
    await new Promise(r => setTimeout(r, 3000));
  }
  
  console.log("\nIndexation terminée !");
}

runIndexer();