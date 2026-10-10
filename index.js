import { generateWithFallback } from "./llm/generate.js";
import "dotenv/config";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { calculate } from "./tools/calculate.js";
import { getCurrentTime } from "./tools/getCurrentTime.js";
import { getWeather } from "./tools/getWeather.js";
import { getOrder } from "./tools/getOrder.js";
import { getCustomer } from "./tools/getCustomer.js";
import { searchProducts } from "./tools/searchProducts.js";
import { searchPolicy } from "./tools/searchPolicy.js";
import { createSupportTicket } from "./tools/createSupportTicket.js";
import { requestApproval } from "./tools/requestApproval.js";
import { cancelOrder } from "./tools/cancelOrder.js";

// -------------------------
// 1. Tools
// -------------------------

// -------------------------
// 2. Tool registry
// -------------------------

const toolRegistry = {
  get_order: {
    definition: {
      type: "function",
      function: {
        name: "get_order",
        description: "Get information about a customer order.",
        parameters: {
          type: "object",
          properties: {
            orderId: {
              type: "string",
              description: "The ID of the order to look up.",
            },
          },
          required: ["orderId"],
        },
      },
    },

    execute: getOrder,
  },
  get_customer: {
    definition: {
      type: "function",
      function: {
        name: "get_customer",
        description: "Get information about a customer.",
        parameters: {
          type: "object",
          properties: {
            customerId: {
              type: "string",
              description: "The ID of the customer to look up.",
            },
          },
          required: ["customerId"],
        },
      },
    },

    execute: getCustomer,
  },
  search_products: {
    definition: {
      type: "function",
      function: {
        name: "search_products",
        description:
          "Search the product catalog for products matching a query.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "The product name, category, or keyword to search for.",
            },
          },
          required: ["query"],
        },
      },
    },

    execute: searchProducts,
  },
  search_policy: {
    definition: {
      type: "function",
      function: {
        name: "search_policy",
        description:
          "Search the company's policies for information relevant to a customer question.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "The policy topic or customer question to search for.",
            },
          },
          required: ["query"],
        },
      },
    },
    execute: searchPolicy,
  },
  create_support_ticket: {
    definition: {
      type: "function",
      function: {
        name: "create_support_ticket",
        description: "Create a support ticket for a customer issue.",
        parameters: {
          type: "object",
          properties: {
            customerId: {
              type: "string",
              description: "The customer's ID.",
            },
            orderId: {
              type: "string",
              description: "The order ID related to the issue.",
            },
            subject: {
              type: "string",
              description: "A short title describing the customer's issue.",
            },
            description: {
              type: "string",
              description: "A detailed description of the customer's issue.",
            },
          },
          required: ["customerId", "orderId", "subject", "description"],
        },
      },
    },
    execute: createSupportTicket,
  },
  request_approval: {
    definition: {
      type: "function",
      function: {
        name: "request_approval",
        description:
          "Request human approval before performing a sensitive business action.",
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              description: "The action that requires approval.",
            },
            reason: {
              type: "string",
              description: "Why the action is being requested.",
            },
            details: {
              type: "object",
              description: "Details needed to understand the requested action.",
            },
          },
          required: ["action", "reason", "details"],
        },
      },
    },
    execute: requestApproval,
  },
  cancel_order: {
    definition: {
      type: "function",
      function: {
        name: "cancel_order",
        description:
          "Cancel an order. This action is sensitive and requires human approval before execution.",
        parameters: {
          type: "object",
          properties: {
            orderId: {
              type: "string",
              description: "The ID of the order to cancel.",
            },
          },
          required: ["orderId"],
        },
      },
    },
    execute: cancelOrder,
  },
  calculate: {
    definition: {
      type: "function",
      function: {
        name: "calculate",
        description: "Perform a mathematical calculation.",
        parameters: {
          type: "object",
          properties: {
            a: {
              type: "number",
              description: "The first number",
            },
            b: {
              type: "number",
              description: "The second number",
            },
            operator: {
              type: "string",
              description: "The mathematical operation to perform",
              enum: ["+", "-", "*", "/"],
            },
          },
          required: ["a", "b", "operator"],
        },
      },
    },

    execute: calculate,
  },

  get_current_time: {
    definition: {
      type: "function",
      function: {
        name: "get_current_time",
        description: "Get the current local date and time.",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    },

    execute: getCurrentTime,
  },

  get_weather: {
    definition: {
      type: "function",
      function: {
        name: "get_weather",
        description: "Get the current weather for a city.",
        parameters: {
          type: "object",
          properties: {
            city: {
              type: "string",
              description: "The name of the city.",
            },
          },
          required: ["city"],
        },
      },
    },
    execute: getWeather,
  },
};

const tools = Object.values(toolRegistry)
  .filter((tool) => tool.definition.function.name !== "request_approval")
  .map((tool) => tool.definition);

// -------------------------
// 3. Create terminal interface
// -------------------------

const rl = readline.createInterface({
  input,
  output,
});

// -------------------------
// 4. Conversation state
// -------------------------

const messages = [
  {
    role: "system",
    content: `
You are an AI customer support agent that can use tools.

Rules:

1. Use tools when they are appropriate.

2. Tool results are authoritative.

3. Never change numerical values returned by tools.

4. Never invent information that is not supported by the conversation or tool results.
   When reporting the result of an action performed by a tool, only state facts
   that are explicitly present in the tool result or already established by
   the conversation. Do not add consequences, guarantees, refunds, notifications,
   emails, or other follow-up events unless a tool result explicitly confirms them.

5. Clearly distinguish between:
   - general company policy information
   - information about the customer's specific order or situation

6. Do not assume that a customer satisfies a policy condition unless
   the conversation or a tool result provides evidence for it.

7. If information about a customer's specific order is required,
   use the appropriate customer or order tool.

8. If the available tools do not provide enough information to answer
   a question reliably, say so instead of guessing.

9. If a tool returns an error, explain the error honestly.

10. Treat estimated dates, expected dates, and predicted values as estimates.
    Never present an estimated value as an actual confirmed value.

11. If a policy depends on an actual event, such as delivery,
    payment, or cancellation, do not assume that the event happened
    merely because an estimated date has passed or is available.

12. When the customer explicitly asks to cancel an order, you must use
    the cancel_order tool with the order ID instead of asking the customer
    for confirmation yourself. The application will pause the action and
    request human approval before the cancellation is executed.

13. When reporting the result of an action, do not reinterpret, explain,
    or add conditions to values returned by the tool.

    For example, if an order tool returns an estimated delivery date,
    report it as an estimated delivery date. Do not say things such as
    "if it had shipped" unless that statement is explicitly supported
    by the tool result or conversation.

    Do not mention refunds, notifications, emails, new orders, or other
    possible follow-up actions unless they were explicitly requested by
    the customer or confirmed by a tool.

14. Do not treat the purchase date as the delivery date.
    If a policy depends on the delivery date and the user only provides
    a purchase date, do not determine eligibility from the purchase date alone.
`,
  },
];

// -------------------------
// Sensitive tools
// -------------------------

const sensitiveTools = new Set(["cancel_order"]);

// -------------------------
// 5. Conversation loop
// -------------------------

while (true) {
  const userInput = await rl.question("\nYou: ");

  // Allow user to exit
  if (userInput.toLowerCase() === "exit") {
    break;
  }

  // Add user message to conversation
  messages.push({
    role: "user",
    content: userInput,
  });

  // -------------------------
  // 6. Agent loop
  // -------------------------

  let toolIterations = 0;
  const MAX_TOOL_ITERATIONS = 10;

  while (true) {
    toolIterations++;

    if (toolIterations > MAX_TOOL_ITERATIONS) {
      console.log("Agent stopped: maximum tool iterations reached.");
      break;
    }

    console.log("\nThinking...\n");

    const response = await generateWithFallback(messages, tools);

    const assistantMessage = response.choices[0].message;
    const toolCalls = assistantMessage.tool_calls;
    // Save assistant response
    messages.push(assistantMessage);

    // -------------------------
    // 7. No tool needed
    // -------------------------

    if (!assistantMessage.tool_calls) {
      if (!assistantMessage.content) {
        console.log("Agent returned an empty response.");
        break;
      }

      console.log("Agent:", assistantMessage.content);
      break;
    }

    // -------------------------
    // 8. Execute requested tools
    // -------------------------

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name;

      const arguments_ =
        typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;

      console.log(`Tool requested: ${toolName}`);
      console.log("Arguments:", arguments_);

      const toolEntry = toolRegistry[toolName];

      if (!toolEntry) {
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: `Error: Unknown tool: ${toolName}`,
        });

        continue;
      }

      try {
        let result;

        if (sensitiveTools.has(toolName)) {
          const approval = await rl.question(
            `\n⚠️ This action requires human approval.\n` +
              `Action: ${toolName}\n` +
              `Arguments: ${JSON.stringify(arguments_)}\n` +
              `Approve? (yes/no): `,
          );

          if (approval.toLowerCase() !== "yes") {
            result = {
              approved: false,
              status: "rejected",
              action: toolName,
              message: "The human operator rejected this action.",
            };
          } else {
            result = await toolEntry.execute(arguments_);
          }
        } else {
          result = await toolEntry.execute(arguments_);
        }

        console.log("Tool result:", result);

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      } catch (error) {
        console.log("Tool error:", error.message);

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: `Error: ${error.message}`,
        });
      }
    }
  }
}
// -------------------------
// 9. Close terminal interface
// -------------------------

rl.close();

console.log("\nGoodbye!");
