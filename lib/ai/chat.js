import { client } from "./client.js";
import { buildPrompt } from "./buildPrompt.js";

export async function handleChat(message, schoolData) {
  const response = await client.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: buildPrompt(schoolData)
      },
      {
        role: "user",
        content: message
      }
    ]
  });

  return response.choices[0].message.content;
}