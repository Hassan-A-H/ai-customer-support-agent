import fs from "fs/promises";
import { createEmbedding } from "./embeddings.js";
import { cosineSimilarity } from "./similarity.js";

export async function retrieveRelevantPolicies(
  query,
  topK = 2,
  minSimilarity = 0.6,
) {
  // Create an embedding for the user's question.
  const queryEmbedding = await createEmbedding(query);

  const file = await fs.readFile("./data/policyEmbeddings.json", "utf-8");

  const documents = JSON.parse(file);

  // Compare the question with every stored chunk.
  const scoredChunks = documents.map((document) => ({
    ...document,
    similarity: cosineSimilarity(queryEmbedding, document.embedding),
  }));

  // Remove chunks that are below our relevance threshold.
  const relevantChunks = scoredChunks.filter(
    (chunk) => chunk.similarity >= minSimilarity,
  );

  // Group chunks belonging to the same policy.
  const policyGroups = new Map();

  for (const chunk of relevantChunks) {
    if (!policyGroups.has(chunk.policyId)) {
      policyGroups.set(chunk.policyId, {
        policyId: chunk.policyId,
        title: chunk.title,
        chunks: [],
      });
    }

    policyGroups.get(chunk.policyId).chunks.push(chunk);
  }

  // Sort the chunks inside each policy by relevance.
  for (const policy of policyGroups.values()) {
    policy.chunks.sort((a, b) => b.similarity - a.similarity);

    // The policy's score is the similarity of its
    // most relevant chunk.
    policy.score = policy.chunks[0].similarity;
  }

  // Rank policies by their best matching chunk.
  const policies = Array.from(policyGroups.values());

  policies.sort((a, b) => b.score - a.score);

  // Return only the most relevant policies.
  return policies.slice(0, topK);
}
