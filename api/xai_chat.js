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
    // 💾 SAVE USER MESSAGE
    // =========================
    const chatRef = db.collection("chats").doc(session);

    await chatRef.collection("messages").add({
      role: "user",
      content: message,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // =========================
    // 📚 LOAD CONTEXT (MEMOIRE)
    // =========================
    const snap = await chatRef.collection("messages")
      .orderBy("timestamp", "asc")
      .limit(20)
      .get();

    const history = snap.docs.map(d => d.data());

    const memoryContext = `
📚 HISTORIQUE CONVERSATION:

${history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}
`;

    // =========================
    // 🤖 AI RESPONSE
    // =========================
    const response = await handleChat(message, memoryContext);

    // =========================
    // 💾 SAVE AI RESPONSE
    // =========================
    await chatRef.collection("messages").add({
      role: "assistant",
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