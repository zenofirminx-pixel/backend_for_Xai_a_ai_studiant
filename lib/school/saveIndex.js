import { db } from "../firebase.js";
import { doc, setDoc } from "firebase/firestore";

export async function saveSchoolIndex(data) {
  if (!data || data.error) return;

  await setDoc(doc(db, "school_index", "global"), {
    ...data,
    savedAt: new Date().toISOString()
  });
}