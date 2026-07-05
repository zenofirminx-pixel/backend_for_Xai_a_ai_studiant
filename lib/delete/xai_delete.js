// /lib/delete/xai_delete.js
import { db } from '../firebase/firebase.js'; // <-- CORRIGÉ

export async function deleteOldSchoolData() {
  try {
    const now = new Date();
    const vingtQuatreHeuresAvant = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    console.log(`Suppression des données avant: ${vingtQuatreHeuresAvant}`);
    
    const snapshot = await db.collection('school_index')
      .where('last_updated', '<', vingtQuatreHeuresAvant)
      .get();

    if (snapshot.empty) {
      console.log("Aucune ancienne donnée à supprimer");
      return 0;
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`${snapshot.size} documents supprimés`);
    return snapshot.size;
  } catch (error) {
    console.error("ERREUR DELETE:", error);
    return 0; // <-- important: on renvoie 0 pour pas bloquer l'index
  }
}