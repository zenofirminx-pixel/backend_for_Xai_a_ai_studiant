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

    const chatRef = db.collection("chats").doc(session);

    // 1. Sauvegarder le message de l'utilisateur
    await chatRef.collection("messages").add({
      role: "user",
      type: "chat_message",
      content: message,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Récupérer les 10 derniers messages (historique récent)
    const chatSnap = await chatRef
      .collection("messages")
      .orderBy("timestamp", "desc")
      .limit(10)
      .get();

    // On inverse pour retrouver l'ordre chronologique
    const history = chatSnap.docs.map(d => d.data()).reverse();

    // 3. Récupérer l'index de l'école
    const schoolSnap = await db.collection("school_index").get();
    const schoolData = schoolSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // 4. Construction du contexte pour l'IA
    const memoryContext = `
📚 CONTEXTE ÉCOLE (TOUTES LES DONNÉES DISPONIBLES):
Chaque objet contient les infos de l'école (cours, emploi du temps, devoirs, annonces). 
Analyse ces données pour répondre précisément à l'élève.

DONNÉES ÉCOLE:
${JSON.stringify(schoolData, null, 2)}

💬 MÉMOIRE DE LA CONVERSATION (Derniers échanges):
${history
  .map(m => (m.role === "user" ? `👨‍🎓 ÉLÈVE: ${m.content}` : `🤖 XAI: ${m.content}`))
  .join("\n")}
`;

    // 5. Génération de la réponse par l'IA
    const response = await handleChat(message, memoryContext);

    // 6. Sauvegarder la réponse de l'assistant
    await chatRef.collection("messages").add({
      role: "assistant",
      type: "chat_response",
      content: response,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({ response });

  } catch (err) {
    console.error("XAI ERROR:", err);
    return res.status(500).json({ error: "Erreur interne XAI" });
  }
}
