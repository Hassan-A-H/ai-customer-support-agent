import OpenAI from "openai";
import "dotenv/config";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function generateOpenRouter(messages, tools) {
  return await client.chat.completions.create({
    model: "openrouter/free",
    messages,
    tools,
  });
}
