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

const XAI_URL = "https://xai-fawn-delta.vercel.app/api/xai_chat/";

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  try {
    const response = await axios.post(XAI_URL, {
      message: message.content,
      user: message.author.id
    });

    await message.reply(response.data.reply);

  } catch (error) {
    console.error(error.response?.data || error.message);
    await message.reply("Erreur de connexion à Xai.");
  }
});

client.login(TOKEN);