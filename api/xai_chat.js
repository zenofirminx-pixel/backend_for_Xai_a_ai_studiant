import { handleChat } from "../lib/ai/chat.js";
import { loadSchoolData } from "../lib/school/storage.js";
import { setCors } from "../lib/cors/cors.js";
import { db } from "../lib/firebase/admin.js";
import { doc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, session = "default" } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: "Message manquant" });
    }

    // =========================
    // 📚 LOAD FIREBASE MEMORY
    // =========================
    const schoolData = await loadSchoolData();

    const schoolContext = schoolData
      ? `
📚 MÉMOIRE ÉCOLE:
${JSON.stringify(schoolData, null, 2)}
`
      : `
📚 MÉMOIRE ÉCOLE:
Aucune donnée scolaire enregistrée.
`;

    // =========================
    // 🧠 SAVE USER MESSAGE
    // =========================
    await addDoc(collection(db, "chats", session, "messages"), {
      role: "user",
      content: message,
      createdAt: serverTimestamp()
    });

    // =========================
    // 🤖 AI RESPONSE
    // =========================
    const response = await handleChat(message, schoolContext);

    // =========================
    // 💾 SAVE AI RESPONSE
    // =========================
    await addDoc(collection(db, "chats", session, "messages"), {
      role: "assistant",
      content: response,
      createdAt: serverTimestamp()
    });

    return res.status(200).json({
      response
    });

  } catch (err) {
    console.error("XAI ERROR:", err);

    return res.status(500).json({
      error: "Erreur interne XAI"
    });
  }
}