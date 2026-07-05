import admin from "firebase-admin";

// ==========================
// INIT FIREBASE ADMIN (SAFE)
// ==========================
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

// ==========================
// SAVE SCHOOL DATA
// ==========================
export async function saveSchoolData(data) {
  try {
    await db.collection("schools").doc("sainte_christine").set(
      {
        latest: data,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error("Firestore SAVE error:", err);
  }
}

// ==========================
// LOAD SCHOOL DATA
// ==========================
export async function loadSchoolData() {
  try {
    const snap = await db
      .collection("schools")
      .doc("sainte_christine")
      .get();

    if (!snap.exists) return null;

    return snap.data().latest || null;
  } catch (err) {
    console.error("Firestore LOAD error:", err);
    return null;
  }
}