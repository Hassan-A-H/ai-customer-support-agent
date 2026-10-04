import fs from "fs/promises";
import { createEmbedding } from "./embeddings.js";
import { cosineSimilarity } from "./similarity.js";

export async function retrieveRelevantPolicies(query, topK = 2) {
  // 1. Create an embedding for the user's question
  const queryEmbedding = await createEmbedding(query);

  // 2. Load our stored policy embeddings
  const file = await fs.readFile(
    "./data/policyEmbeddings.json",
    "utf-8"
  );

  const documents = JSON.parse(file);

  // 3. Calculate similarity between the question
  //    and every stored policy
  const results = documents.map((document) => ({
    ...document,
    similarity: cosineSimilarity(
      queryEmbedding,
      document.embedding
    ),
  }));

  // 4. Highest similarity first
  results.sort((a, b) => b.similarity - a.similarity);

  // 5. Return only the best matches
  return results.slice(0, topK);
}