import { db } from "../firebase.js";
import { doc, getDoc } from "firebase/firestore";

export async function loadSchoolIndex() {
  const snap = await getDoc(doc(db, "school_index", "global"));

  if (!snap.exists()) return null;

  return snap.data();
}