import { retrieveRelevantPolicies } from "../rag/retrieve.js";

export async function searchPolicy(args) {
  const { query } = args;

  const policies = await retrieveRelevantPolicies(query);

  return policies.map((policy) => ({
    policyId: policy.policyId,
    title: policy.title,
    score: policy.score,
    chunks: policy.chunks.map((chunk) => ({
      chunkId: chunk.id,
      content: chunk.text,
      similarity: chunk.similarity,
    })),
  }));
}
