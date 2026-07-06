const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.DISCORD_TOKEN;

// 👉 TON BACKEND XAI (prioritaire)
const XAI_URL = "https://xai-fawn-delta.vercel.app/api/xai_chat/";

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  try {
    const response = await axios.post(XAI_URL, {
      message: message.content,
      user: message.author.id
    });

    const reply = response.data?.reply;

    if (!reply) {
      return message.reply("Erreur: réponse IA vide.");
    }

    await message.reply(reply);

  } catch (error) {
    console.log("Erreur XAI:", error.message);
    await message.reply("Connexion XAI impossible.");
  }
});

client.login(TOKEN);