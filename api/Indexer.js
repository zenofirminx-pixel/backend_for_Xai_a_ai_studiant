// /api/indexer.js - VERSION TEST
import { db } from '../lib/firebase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  console.log("=== TEST LANCEMENT INDEXER ===");

  // On écrit juste 1 doc bidon pour tester
  await db.collection('school_index').doc('test_123').set({
    type: "school_index",
    school_id: "test_123",
    school_name: "TEST ECOLE",
    last_updated: new Date()
  });

  console.log("=== DOC TEST ENREGISTRE ===");
  return res.status(200).json({ succès: true, message: "Test OK" });
}