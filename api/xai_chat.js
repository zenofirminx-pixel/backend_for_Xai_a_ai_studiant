import { handleChat } from "../lib/ai/chat.js";
import { setCors } from "../lib/cors/cors.js";
import { db } from "../lib/firebase/firebase.js"; // <-- TA BONNE ROUTE
import admin from "firebase-admin";

async function searchSchoolIndex(query) {
  console.log("Recherche dans school_index:", query);

  // Recherche simple par mots-clés dans les chunks
  const keywords = query.toLowerCase().split(' ').filter(w => w.length > 3);
  const snapshot = await db.collection("school_index").limit(3).get();

  let results = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    const text = JSON.stringify(data).toLowerCase();

    // Score simple: combien de mots-clés sont présents
    const score = keywords.filter(k => text.includes(k)).length;

    if(score > 0) {
      results.push({
        school: data.school_name,
        content: data.documents[0]?.content?.substring(0, 500) || "",
        url: data.source_urls[0]
      });
    }
  });

  // Trie par score et prend les 2 meilleurs
  return results.sort((a,b) => b.score - a.score).slice(0, 2);
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method!== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { message, session = "default" } = req.body || {};
    if (!message) return res.status(400).json({ error: "Message manquant" });

    const chatRef = db.collection("chats").doc(session);

    // 1. SAVE USER
    await chatRef.collection("messages").add({
      role: "user",
      content: message,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. LOAD MEMORY
    const snap = await chatRef.collection("messages").orderBy("timestamp", "asc").limit(20).get();
    const history = snap.docs.map(d => d.data());

    const memoryContext = `
📚 MÉMOIRE CONVERSATION:
${history.map(m => m.role === "user"? `👨‍🎓 ÉLÈVE: ${m.content}` : `🤖 XAI: ${m.content}`).join("\n")}
`;

    // 3. NOUVEAUTE: CHERCHER DANS L'INDEX
    const schoolDocs = await searchSchoolIndex(message);

    const ragContext = schoolDocs.length > 0? `
📖 CONTEXTE DES ÉCOLES TROUVÉES:
${schoolDocs.map((d, i) => `
[${i+1}] ${d.school}
${d.content}
Source: ${d.url}
`).join("\n")}
UTILISE CES INFOS POUR RÉPONDRE. SI RIEN N'EST PERTINENT, DIS-LE.
` : "Aucun document d'école trouvé pour cette question.";

    // 4. AI RESPONSE avec les 2 contextes
    const fullContext = memoryContext + "\n\n" + ragContext;
    const response = await handleChat(message, fullContext);

    // 5. SAVE AI
    await chatRef.collection("messages").add({
      role: "assistant",
      content: response,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({
      response,
      sources: schoolDocs.map(d => ({school: d.school, url: d.url})) // pour debug
    });

  } catch (err) {
    console.error("XAI ERROR:", err);
    return res.status(500).json({ error: "Erreur interne XAI" });
  }
}