import axios from "axios";
import xaiHandler from "./xai_chat.js"; // IMPORT DIRECT

export default async function handler(req, res) {
  // 1. CORS pour ton UI
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { message, channel_id } = req.body;

    if (!process.env.DISCORD_TOKEN) {
      return res.status(500).json({ error: "DISCORD_TOKEN manquant dans Vercel" });
    }
    if (!channel_id) {
      return res.status(400).json({ error: "channel_id manquant" });
    }
    if (!message) {
      return res.status(400).json({ error: "message manquant" });
    }

    // 2. APPELER xai_chat.js DIRECTEMENT AU LIEU DE AXIOS
    // On simule un req/res pour xai_chat
    let xaiReply = "";
    const fakeReq = { body: { message, user: "discord" } };
    const fakeRes = {
      status: (code) => ({ json: (data) => { xaiReply = data.reply } }),
      json: (data) => { xaiReply = data.reply }
    };
    
    await xaiHandler(fakeReq, fakeRes);

    if (!xaiReply) {
      return res.status(500).json({ error: "xai_chat n'a rien renvoyé" });
    }

    // 3. ENVOYER LA REPONSE DANS DISCORD AVEC LE TOKEN
    await axios.post(
      `https://discord.com/api/v10/channels/${channel_id}/messages`,
      { content: xaiReply },
      {
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return res.status(200).json({ success: true, reply: xaiReply });

  } catch (error) {
    console.error("CRASH:", error.response?.data || error.message);
    return res.status(500).json({ error: error.response?.data || error.message });
  }
}