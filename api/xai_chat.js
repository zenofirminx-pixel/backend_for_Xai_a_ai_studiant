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

    // 1. Récupérer d'abord les 9 anciens messages pour éviter le bug du serverTimestamp
    const chatSnap = await chatRef
      .collection("messages")
      .orderBy("timestamp", "desc")
      .limit(9)
      .get();

    const history = chatSnap.docs.map(d => d.data()).reverse();

    // 2. Ajouter le message actuel localement à l'historique pour l'IA
    history.push({ role: "user", content: message });

    // 3. Sauvegarder le message de l'élève dans Firestore
    await chatRef.collection("messages").add({ 
      role: "user", 
      type: "chat_message", 
      content: message, 
      timestamp: admin.firestore.FieldValue.serverTimestamp() 
    }); 

    // 4. Récupérer toute la collection school_index
    const schoolSnap = await db.collection("school_index").get(); 
    const schoolData = schoolSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })); 

    // 5. Build du contexte (Ta structure exacte d'origine, nettoyée des bugs de syntaxe)
    const memoryContext = ` 
📚 CONTEXTE ÉCOLE (TOUTES LES DONNÉES DISPONIBLES):

RÈGLE IMPORTANTE:
Ceci est une base de données scolaire Chaque objet peut contenir : cours, emploi du temps, devoirs, annonces Tu dois analyser et extraire seulement ce qui est utile à la question 

DONNÉES ÉCOLE:
${JSON.stringify(schoolData, null, 2)}

💬 MÉMOIRE CONVERSATION:
${history
  .map(m => (m.role === "user" ? `👨‍🎓 ÉLÈVE: ${m.content}` : `🤖 XAI: ${m.content}`))
  .join("\n")}
`;

    // 6. Envoi à ton module IA
    const response = await handleChat(message, memoryContext); 

    // 7. Sauvegarder la réponse de l'IA
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
