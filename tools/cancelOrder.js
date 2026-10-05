import fs from "fs/promises";

export async function cancelOrder(args) {
  const { orderId } = args;

  const file = await fs.readFile("./data/orders.json", "utf-8");
  const orders = JSON.parse(file);

  const order = orders.find((order) => order.id === orderId);

  if (!order) {
    throw new Error(`Order ${orderId} was not found.`);
  }

  if (order.status !== "processing") {
    throw new Error(
      `Order ${orderId} cannot be cancelled because its status is "${order.status}".`,
    );
  }

  order.status = "cancelled";

  await fs.writeFile("./data/orders.json", JSON.stringify(orders, null, 2));

  return order;
}
