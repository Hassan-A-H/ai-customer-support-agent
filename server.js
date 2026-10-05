import express from "express";
import { runAgent } from "./agent.js";

// Temporary in-memory store for conversation state.
// Later, MongoDB will replace this so conversations survive
// server restarts and can be shared across users/devices.
const conversations = new Map();

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "AI Agent API is running",
  });
});

app.post("/chat", async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({
        error: "sessionId and message are required.",
      });
    }

    // Get the existing conversation history for this session.
    // If this is a new session, start with an empty history.
    let messages = conversations.get(sessionId);

    if (!messages) {
      messages = undefined;
    }

    // Run the agent using the conversation history.
    const result = await runAgent(message, messages);

    // Save the updated conversation history.
    // This allows the next request with the same sessionId
    // to continue the previous conversation.
    if (result.messages) {
      conversations.set(sessionId, result.messages);
    }

    res.json({
      success: result.success,
      message: result.message,
      requiresApproval: result.requiresApproval ?? false,
    });
  } catch (error) {
    console.error("Agent error:", error);

    res.status(500).json({
      error: "The agent failed to process the request.",
    });
  }
});
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
