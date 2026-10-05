import { searchPolicy } from "../tools/searchPolicy.js";

const results = await searchPolicy({
  query: "How many days do I have to return a product?",
});

console.dir(results, { depth: null });
