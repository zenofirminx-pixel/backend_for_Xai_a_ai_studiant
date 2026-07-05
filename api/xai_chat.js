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
    // 💾 1. SAVE USER MESSAGE
    // =========================
    const chatRef = db.collection("chats").doc(session);

    await chatRef.collection("messages").add({
      role: "user",
      type: "chat_message",
      content: message,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // =========================
    // 📚 2. LOAD MEMORY (LAST MESSAGES)
    // =========================
    const snap = await chatRef
      .collection("messages")
      .orderBy("timestamp", "asc")
      .limit(20)
      .get();

    const history = snap.docs.map(d => d.data());

    // =========================
    // 🧠 3. BUILD SAFE MEMORY CONTEXT
    // =========================
    const memoryContext = `
📚 MÉMOIRE CONVERSATION (NE PAS CONFONDRE AVEC DES COURS):

RÈGLE IMPORTANTE:
- USER = message élève
- ASSISTANT = réponse IA
- CE NE SONT PAS DES LEÇONS

HISTORIQUE:

${history
  .map(m => {
    if (m.role === "user") {
      return `👨‍🎓 ÉLÈVE: ${m.content}`;
    }
    return `🤖 XAI: ${m.content}`;
  })
  .join("\n")}
`;

    // =========================
    // 🤖 4. AI RESPONSE
    // =========================
    const response = await handleChat(message, memoryContext);

    // =========================
    // 💾 5. SAVE AI RESPONSE
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