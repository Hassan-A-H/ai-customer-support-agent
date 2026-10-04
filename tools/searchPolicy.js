import fs from "fs/promises";

export async function searchPolicy(args) {
  const { query } = args;

  const file = await fs.readFile("./data/policies.json", "utf-8");
  const policies = JSON.parse(file);

  const searchTerm = query.toLowerCase();

  const results = policies.filter((policy) => {
    return (
      policy.title.toLowerCase().includes(searchTerm) ||
      policy.content.toLowerCase().includes(searchTerm)
    );
  });

  return results;
}