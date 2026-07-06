import axios from "axios";

export default async function handler(req, res) {
  // 1. CORS pour ton UI si besoin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 2. Vercel envoie en POST
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { message, channel_id } = req.body; // Discord envoie ça en webhook

    if (!process.env.DISCORD_TOKEN) {
      return res.status(500).json({ error: "DISCORD_TOKEN manquant dans Vercel Env Variables" });
    }

    // 3. Appel ton xai_chat
    const xaiResponse = await axios.post(
      "https://xai-fawn-delta.vercel.app/api/xai_chat/",
      { message, user: "discord_user" },
      { timeout: 25000 }
    );

    const reply = xaiResponse.data.reply;

    // 4. Renvoyer la réponse à Discord
    // Si tu utilises webhook: return res.json({ content: reply })
    return res.status(200).json({ reply });

  } catch (error) {
    console.error("CRASH BOT:", error.response?.data || error.message);
    return res.status(500).json({ 
      error: error.response?.data?.error || error.message 
    });
  }
}