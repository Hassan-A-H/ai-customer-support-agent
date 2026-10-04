import fs from "fs/promises";

export async function loadDocuments() {
  const file = await fs.readFile("./data/policies.json", "utf-8");
  const policies = JSON.parse(file);

  return policies.map((policy) => ({
    id: policy.id,
    title: policy.title,
    text: policy.content,
  }));
}