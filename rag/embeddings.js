import OpenAI from "openai";
import "dotenv/config";

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function createEmbedding(text) {
  const response = await client.embeddings.create({
    model: "nvidia/nemotron-3-embed-1b:free",
    input: text,
  });

  return response.data[0].embedding;
}


