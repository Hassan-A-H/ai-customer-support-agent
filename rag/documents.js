import fs from "fs/promises";

export async function loadDocuments() {
  const file = await fs.readFile("./data/policies.json", "utf-8");
  const policies = JSON.parse(file);

  const chunks = [];

  for (const policy of policies) {
    // Split the policy into paragraphs.
    // Each paragraph becomes an independent chunk that can
    // later receive its own embedding.
    const paragraphs = policy.content
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    paragraphs.forEach((paragraph, index) => {
      chunks.push({
        id: `${policy.id}_chunk_${index + 1}`,
        policyId: policy.id,
        title: policy.title,
        text: paragraph,
      });
    });
  }

  return chunks;
}