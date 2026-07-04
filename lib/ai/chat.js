import { client } from "./client.js";
import { SYSTEM_PROMPT } from "./prompt.js";

export async function handleChat(message, schoolData) {
  const context = schoolData
    ? JSON.stringify(schoolData).slice(0, 3000)
    : "Aucune donnée école disponible";

  const response = await client.chat.completions.create({
    model: "openai/gpt-4o-mini", // ou autre modèle OpenRouter
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT + `

Données école:
${context}
        `
      },
      {
        role: "user",
        content: message
      }
    ]
  });

  return response.choices[0].message.content;
}