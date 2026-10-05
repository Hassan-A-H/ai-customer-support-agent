import OpenAI from "openai";
import "dotenv/config";

let client = null;

if (process.env.GROQ_API_KEY) {
  client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

export async function generateGroq(messages, tools) {
  if (!client) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  return await client.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages,
    tools,
  });
}
