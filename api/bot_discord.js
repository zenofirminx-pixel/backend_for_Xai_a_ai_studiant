import { Client, GatewayIntentBits } from "discord.js";
import axios from "axios";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

client.once("ready", () => {
  console.log(`Bot connecté: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  try {
    await message.channel.sendTyping();

    // Appel OpenRouter direct
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "x-ai/grok-4-fast",
        messages: [{ role: "user", content: message.content }]
      },
      {
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const reply = response.data.choices[0].message.content;
    await message.reply(reply);

  } catch (error) {
    console.error(error.response?.data || error.message);
    await message.reply("Erreur OpenRouter");
  }
});

client.login(DISCORD_TOKEN);