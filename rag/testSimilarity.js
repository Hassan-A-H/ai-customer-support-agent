import { cosineSimilarity } from "./similarity.js";

const a = [1, 0, 0];
const b = [1, 0, 0];
const c = [0, 1, 0];

console.log("A vs B:", cosineSimilarity(a, b));
console.log("A vs C:", cosineSimilarity(a, c));