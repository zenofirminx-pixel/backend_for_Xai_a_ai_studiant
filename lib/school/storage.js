import { db } from "../firebase/firebase.js";

export async function loadSchoolData() {
  const doc = await db.collection("school_index").doc("main").get();

  if (!doc.exists) return null;

  return doc.data().data;
}