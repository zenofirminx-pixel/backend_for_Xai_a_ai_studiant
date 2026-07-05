import { handleChat } from "../lib/ai/chat.js";
import { loadSchoolData } from "../lib/school/storage.js";
import { setCors } from "../lib/cors/cors.js";

export default async function handler(req, res) {
  setCors(res);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: "Message manquant" });
    }

    let schoolData = null;

    try {
      schoolData = loadSchoolData();
    } catch (e) {
      schoolData = null; // ne bloque jamais le chat
    }

    const response = await handleChat(message, schoolData);

    return res.status(200).json({ response });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Erreur interne XAI"
    });
  }
}