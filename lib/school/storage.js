import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🔥 SAUVEGARDE
export async function saveSchoolData(data) {
  const ref = doc(db, "schools", "sainte_christine");

  await setDoc(ref, {
    latest: data,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

// 📖 LECTURE
export async function loadSchoolData() {
  const ref = doc(db, "schools", "sainte_christine");
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return snap.data().latest || null;
}