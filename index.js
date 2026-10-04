import OpenAI from "openai";
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


const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

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
            description: "The ID of the order to look up."
          }
        },
        required: ["orderId"]
      }
    }
  },

  execute: getOrder
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
            description: "The ID of the customer to look up."
          }
        },
        required: ["customerId"]
      }
    }
  },

  execute: getCustomer
},
search_products: {
  definition: {
    type: "function",
    function: {
      name: "search_products",
      description: "Search the product catalog for products matching a query.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The product name, category, or keyword to search for."
          }
        },
        required: ["query"]
      }
    }
  },

  execute: searchProducts
},
search_policy: {
  definition: {
    type: "function",
    function: {
      name: "search_policy",
      description: "Search the company's policies for information relevant to a customer question.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The policy topic or customer question to search for."
          }
        },
        required: ["query"]
      }
    }
  },
  execute: searchPolicy
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

const tools = Object.values(toolRegistry).map((tool) => tool.definition);

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
`
  }
];

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

    const response = await client.chat.completions.create({
      model: "openrouter/free",
      messages,
      tools,
    });

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
        const result = await toolEntry.execute(arguments_);

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
