import { handleChat } from "../lib/ai/chat.js";
import { loadSchoolData } from "../lib/school/storage.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body;

    const schoolData = loadSchoolData();

    const response = await handleChat(message, schoolData);

    return res.status(200).json({
      response
    });

  } catch (err) {
    return res.status(500).json({
      error: "Erreur chat XAI"
    });
  }
}