import { Client, GatewayIntentBits } from "discord.js";
import axios from "axios";
import "dotenv/config"; // pour tester en local

console.log("TOKEN existe?",!!process.env.DISCORD_TOKEN);
console.log("OPENROUTER existe?",!!process.env.OPENROUTER_API_KEY);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`✅ Bot connecté: ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  console.log(`📩 Message reçu de ${message.author.username}: ${message.content}`);

  try {
    await message.channel.sendTyping();

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "x-ai/grok-4-fast",
        messages: [{ role: "user", content: message.content }]
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://discord.com", // obligatoire OpenRouter
          "X-Title": "DiscordBot"
        }
      }
    );

    const reply = response.data.choices[0].message.content;
    console.log("🤖 Réponse IA:", reply);
    await message.reply(reply);

  } catch (error) {
    console.error("❌ ERREUR COMPLETE:", error.response?.data || error.message);
    await message.reply(`Erreur: ${error.response?.data?.error?.message || error.message}`);
  }
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error("❌ ERREUR LOGIN DISCORD:", err);
});