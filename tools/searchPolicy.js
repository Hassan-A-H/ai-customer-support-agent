import { retrieveRelevantPolicies } from "../rag/retrieve.js";

export async function searchPolicy(args) {
  const { query } = args;

  const results = await retrieveRelevantPolicies(query);

  return results.map((result) => ({
    id: result.id,
    title: result.title,
    content: result.text,
    similarity: result.similarity,
  }));
}