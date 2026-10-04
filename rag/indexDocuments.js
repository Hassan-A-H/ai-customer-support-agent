import fs from "fs/promises";
import { loadDocuments } from "./documents.js";
import { createEmbedding } from "./embeddings.js";

const documents = await loadDocuments();

const indexedDocuments = [];

for (const document of documents) {
  console.log(`Embedding: ${document.title}`);

  const embedding = await createEmbedding(document.text);

  indexedDocuments.push({
    ...document,
    embedding,
  });
}

await fs.writeFile(
  "./data/policyEmbeddings.json",
  JSON.stringify(indexedDocuments, null, 2)
);

console.log("\nSaved embeddings to data/policyEmbeddings.json");