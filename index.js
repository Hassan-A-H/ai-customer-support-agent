import OpenAI from "openai";
import "dotenv/config";
import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
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

function calculate(args) {
  const { a, b, operator } = args;

  switch (operator) {
    case "+":
      return a + b;

    case "-":
      return a - b;

    case "*":
      return a * b;

    case "/":
      if (b === 0) {
        throw new Error("Cannot divide by zero");
      }
      return a / b;

    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
}

function getCurrentTime(args) {
  return new Date().toLocaleTimeString();
}

function getWeatherDescription(code) {
  const descriptions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };

  return descriptions[code] ?? "Unknown weather condition";
}

async function getWeather(args) {
  const { city } = args;

  // Step 1: Find the city's coordinates
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = await geocodingResponse.json();

  if (!geocodingData.results || geocodingData.results.length === 0) {
    throw new Error(`Could not find city: ${city}`);
  }

  const location = geocodingData.results[0];

  // Step 2: Get weather for those coordinates
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;

  const weatherResponse = await fetch(weatherUrl);
  const weatherData = await weatherResponse.json();

  if (!weatherResponse.ok) {
    throw new Error("Weather API request failed");
  }
  const weatherCode = weatherData.current.weather_code;

  return {
    city: location.name,
    country: location.country,
    temperature: weatherData.current.temperature_2m,
    apparentTemperature: weatherData.current.apparent_temperature,
    condition: getWeatherDescription(weatherCode),
    windSpeed: weatherData.current.wind_speed_10m,
    unit: weatherData.current_units.temperature_2m,
  };
}

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
        description: "Get the current local time.",
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
You are an AI agent that can use tools.

Rules:
1. Use tools when they are appropriate.
2. Tool results are authoritative.
3. Never change numerical values returned by tools.
4. Never invent information that is not supported by the conversation or tool results.
5. If a tool returns an error, explain the error honestly.
`,
  },
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
