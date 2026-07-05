import { handleChat } from "../lib/ai/chat.js";
import { loadSchoolData } from "../lib/school/storage.js";
import { setCors } from "../lib/cors/cors.js";

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: "Message manquant" });
    }

    // 📚 lecture Firebase (ou storage local)
    const schoolData = await loadSchoolData();

    // 🧠 CONVERSION EN MÉMOIRE IA (IMPORTANT)
    const memoryContext = schoolData
      ? `
📚 DONNÉES ÉCOLE:
${JSON.stringify(schoolData, null, 2)}
`
      : `
📚 DONNÉES ÉCOLE:
Aucune donnée enregistrée.
`;

    // 🤖 envoi au modèle avec contexte
    const response = await handleChat(message, memoryContext);

    return res.status(200).json({ response });

  } catch (err) {
    console.error("XAI ERROR:", err);

    return res.status(500).json({
      error: "Erreur interne XAI"
    });
  }
}