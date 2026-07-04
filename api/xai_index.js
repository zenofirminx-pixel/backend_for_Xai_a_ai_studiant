import { indexSchoolSite } from "../lib/school/indexer.js";
import { saveSchoolData } from "../lib/school/storage.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { url } = req.body;

    const data = await indexSchoolSite(url);

    saveSchoolData(data);

    return res.status(200).json({
      success: true,
      message: "Indexation terminée",
      data
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Erreur indexation"
    });
  }
}