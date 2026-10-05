import fs from "fs/promises";

export async function createSupportTicket(args) {
  const { customerId, orderId, subject, description } = args;

  const file = await fs.readFile("./data/tickets.json", "utf-8");
  const tickets = JSON.parse(file);

  const ticket = {
    id: `T${1001 + tickets.length}`,
    customerId,
    orderId,
    subject,
    description,
    status: "open",
    createdAt: new Date().toISOString(),
  };

  tickets.push(ticket);

  await fs.writeFile("./data/tickets.json", JSON.stringify(tickets, null, 2));

  return ticket;
}
