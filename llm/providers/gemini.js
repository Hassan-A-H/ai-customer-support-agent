import OpenAI from "openai";
import "dotenv/config";

const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export async function generateGemini(messages, tools) {
  return await client.chat.completions.create({
    model: "gemini-3.8-flash",
    messages,
    tools,
  });
}