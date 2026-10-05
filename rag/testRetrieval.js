import { retrieveRelevantPolicies } from "./retrieve.js";

const query = "Can I return my keyboard within 30 days?";

const results = await retrieveRelevantPolicies(query, 9, 0);

for (const result of results) {
  console.log("\n---");
  console.log("Title:", result.title);
  console.log("Similarity:", result.similarity);
  console.log("Content:", result.text);
}