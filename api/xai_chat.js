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
    // 💬 CHAT MEMORY (10 messages)
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
      .orderBy("timestamp", "desc")
      .limit(10)
      .get();

    const history = chatSnap.docs
      .map(d => d.data())
      .reverse(); // remettre dans l'ordre naturel

    // =========================
    // 📚 SCHOOL INDEX (simple + safe)
    // =========================
    const schoolSnap = await db.collection("school_index").get();

    const schoolData = schoolSnap.docs.map(doc => doc.data());

    // =========================
    // 🧠 BUILD CONTEXT (PROPRE)
    // =========================

    const schoolContext = schoolData.map((item, i) => {
      return `
🏫 ÉCOLE ${i + 1}:
${item.school_name || "École inconnue"}

📚 CONTENU:
${(item.documents || [])
  .slice(0, 3)
  .map(d => `- ${d.title}: ${d.content?.slice(0, 150) || ""}`)
  .join("\n")}

📅 EMPLOI DU TEMPS:
${JSON.stringify(item.schedule || {}, null, 2)}

📝 DEVOIRS:
${JSON.stringify(item.homeworks || [], null, 2)}
`;
    }).join("\n-----------------\n");

    const memoryContext = `
📚 CONTEXTE ÉCOLE:
${schoolContext || "Aucune donnée école"}

---

💬 MÉMOIRE CONVERSATION (10 derniers messages):

${history
  .map((m, i) =>
    m.role === "user"
      ? `${i + 1}. Élève: ${m.content}`
      : `${i + 1}. Assistant: ${m.content}`
  )
  .join("\n")}

⚠️ IMPORTANT:
- Tu continues une conversation en cours
- Tu ne dois jamais recommencer par "bonjour"
- Tu utilises les données école si elles existent
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