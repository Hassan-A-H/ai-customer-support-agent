import { retrieveRelevantPolicies } from "./retrieve.js";

const query = "I want to cancel my order.";

const results = await retrieveRelevantPolicies(query);

for (const result of results) {
  console.log("\n---");
  console.log("Title:", result.title);
  console.log("Similarity:", result.similarity);
  console.log("Content:", result.text);
}