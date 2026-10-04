import fs from "fs/promises";

export async function getCustomer(args) {
  const { customerId } = args;

  const file = await fs.readFile("./data/customers.json", "utf-8");
  const customers = JSON.parse(file);

  const customer = customers.find(
    (customer) => customer.id === customerId
  );

  if (!customer) {
    throw new Error(`Customer ${customerId} was not found.`);
  }

  return customer;
}