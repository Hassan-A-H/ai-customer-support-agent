import { generateOpenRouter } from "./providers/openrouter.js";
import { generateGemini } from "./providers/gemini.js";
import { generateGroq } from "./providers/groq.js";

const providers = [
  {
    name: "OpenRouter",
    apiKey: process.env.OPENROUTER_API_KEY,
    generate: generateOpenRouter,
  },
  {
    name: "Gemini",
    apiKey: process.env.GEMINI_API_KEY,
    generate: generateGemini,
  },
  {
    name: "Groq",
    apiKey: process.env.GROQ_API_KEY,
    generate: generateGroq,
  },
];

export async function generateWithFallback(messages, tools) {
  const errors = [];

  for (const provider of providers) {
    // Don't try a provider if its API key isn't configured.
    if (!provider.apiKey) {
      console.log(`Skipping ${provider.name}: API key not configured.`);
      continue;
    }

    try {
      console.log(`Trying ${provider.name}...`);

      const response = await provider.generate(messages, tools);

      console.log(`${provider.name} succeeded.`);

      return response;
    } catch (error) {
      console.log(
        `${provider.name} failed: ${error.status ?? "unknown error"}`,
      );

      errors.push({
        provider: provider.name,
        error,
      });
    }
  }

  throw new Error(
    `All configured LLM providers failed:\n${errors
      .map((item) => `- ${item.provider}: ${item.error.message}`)
      .join("\n")}`,
  );
}
