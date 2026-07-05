import { handleChat } from "../lib/ai/chat.js";
import { loadSchoolData } from "../lib/school/storage.js";
import { setCors } from "../lib/cors/cors.js";

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: "Message manquant" });

  // 👉 UNE SEULE SOURCE DE VÉRITÉ
  const schoolData = loadSchoolData(); // pas de try/catch inutile ici

  const response = await handleChat(message, schoolData);

  return res.status(200).json({ response });
}