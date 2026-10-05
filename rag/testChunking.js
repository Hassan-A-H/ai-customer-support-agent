import { loadDocuments } from "./documents.js";

const chunks = await loadDocuments();

console.log(`Total chunks: ${chunks.length}`);

for (const chunk of chunks) {
  console.log("\n--------------------");
  console.log("Chunk ID:", chunk.id);
  console.log("Policy ID:", chunk.policyId);
  console.log("Title:", chunk.title);
  console.log("Text:", chunk.text);
}