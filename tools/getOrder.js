import fs from "fs/promises";

export async function getOrder(args) {
  const { orderId } = args;

  const file = await fs.readFile("./data/orders.json", "utf-8");
  const orders = JSON.parse(file);

  const order = orders.find((order) => order.id === orderId);

  if (!order) {
    throw new Error(`Order ${orderId} was not found.`);
  }

  return order;
}