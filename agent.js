import { generateWithFallback } from "./llm/generate.js";
import "dotenv/config";

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

const systemMessage = {
  role: "system",
  content: `
You are an AI customer support agent that can use tools.

Rules:

1. Use tools when they are appropriate.

2. Tool results are authoritative.

3. Never change numerical values returned by tools.

4. Never invent information that is not supported by the conversation or tool results.

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
`,
};

const sensitiveTools = new Set(["cancel_order"]);

export async function runAgent(userInput, messages = [systemMessage]) {
  messages.push({
    role: "user",
    content: userInput,
  });

  let toolIterations = 0;
  const MAX_TOOL_ITERATIONS = 10;

  while (true) {
    toolIterations++;

    if (toolIterations > MAX_TOOL_ITERATIONS) {
      return {
        success: false,
        message: "Agent stopped: maximum tool iterations reached.",
        messages,
      };
    }

    const response = await generateWithFallback(messages, tools);

    const assistantMessage = response.choices[0].message;

    messages.push(assistantMessage);

    if (!assistantMessage.tool_calls) {
      return {
        success: true,
        message: assistantMessage.content || "",
        messages,
      };
    }

    for (const toolCall of assistantMessage.tool_calls) {
      const toolName = toolCall.function.name;

      const arguments_ =
        typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;

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
          return {
            success: false,
            requiresApproval: true,
            action: toolName,
            arguments: arguments_,
            toolCallId: toolCall.id,
            messages,
          };
        }

        result = await toolEntry.execute(arguments_);

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      } catch (error) {
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: `Error: ${error.message}`,
        });
      }
    }
  }
}
