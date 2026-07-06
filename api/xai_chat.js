import { handleChat } from "../lib/ai/chat.js";
import { setCors } from "../lib/cors/cors.js";
import { db } from "../lib/firebase/firebase.js";
import admin from "firebase-admin";

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
    // 💬 CHAT MEMORY
    // =========================
    const chatRef = db.collection("chats").doc(session);

    await chatRef.collection("messages").add({
      role: "user",
      type: "chat_message",
      content: message,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    const chatSnap = await chatRef
      .collection("messages")
      .orderBy("timestamp", "asc")
      .limit(20)
      .get();

    const history = chatSnap.docs.map(d => d.data());

    // =========================
    // 📚 SCHOOL INDEX (TOUTE LA COLLECTION)
    // =========================
    const schoolSnap = await db.collection("school_index").get();

    const schoolData = schoolSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // =========================
    // 🧠 BUILD CONTEXT
    // =========================
    const memoryContext = `
📚 CONTEXTE ÉCOLE (TOUTES LES DONNÉES DISPONIBLES):

RÈGLE IMPORTANTE:
- Ceci est une base de données scolaire
- Chaque objet peut contenir : cours, emploi du temps, devoirs, annonces
- Tu dois analyser et extraire seulement ce qui est utile à la question

DONNÉES ÉCOLE:
${JSON.stringify(schoolData, null, 2)}

---

💬 MÉMOIRE CONVERSATION:

${history
  .map(m =>
    m.role === "user"
      ? `👨‍🎓 ÉLÈVE: ${m.content}`
      : `🤖 XAI: ${m.content}`
  )
  .join("\n")}
`;

    // =========================
    // 🤖 AI RESPONSE
    // =========================
    const response = await handleChat(message, memoryContext);

    // =========================
    // 💾 SAVE RESPONSE
    // =========================
    await chatRef.collection("messages").add({
      role: "assistant",
      type: "chat_response",
      content: response,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({ response });

  } catch (err) {
    console.error("XAI ERROR:", err);

    return res.status(500).json({
      error: "Erreur interne XAI"
    });
  }
}