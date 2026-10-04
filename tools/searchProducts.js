import fs from "fs/promises";

export async function searchProducts(args) {
  const { query } = args;

  const file = await fs.readFile("./data/products.json", "utf-8");
  const products = JSON.parse(file);

  const searchTerm = query.toLowerCase();

  const results = products.filter((product) => {
    return (
      product.name.toLowerCase().includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm) ||
      product.description.toLowerCase().includes(searchTerm)
    );
  });

  return results;
}