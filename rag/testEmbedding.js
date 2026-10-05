import { createEmbedding } from "./embeddings.js";

const text = "Customers can return products within 30 days of delivery.";

const embedding = await createEmbedding(text);

console.log("Embedding generated successfully.");
console.log("Dimensions:", embedding.length);
console.log("First 5 values:", embedding.slice(0, 5));