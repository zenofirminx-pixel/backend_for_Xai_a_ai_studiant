import OpenAI from "openai";

export const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://xai.vercel.app",
    "X-Title": "XAI School Assistant"
  }
});