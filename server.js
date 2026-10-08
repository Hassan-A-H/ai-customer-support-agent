import express from "express";
import { runAgent } from "./agent.js";
import { getConversation, saveConversation } from "./conversationStore.js";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    message: "AI Agent API is running",
  });
});

// Load the conversation history for a session.
// The React frontend uses this when the page is opened or refreshed.
app.get("/conversation/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const conversation = await getConversation(sessionId);

    // MongoDB stores the complete agent history, including
    // system messages and internal tool calls.
    //
    // The UI only needs messages that are actually visible
    // to the customer.
    const messages = (conversation?.messages ?? [])
      .filter(
        (message) =>
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string" &&
          message.content.trim() !== "",
      )
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    res.json({
      messages,
    });
  } catch (error) {
    console.error("Failed to load conversation:", error);

    res.status(500).json({
      error: "Failed to load conversation.",
    });
  }
});

app.post("/chat", async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({
        error: "sessionId and message are required.",
      });
    }

    // Load the conversation history from MongoDB.
    // If this is a new session, there will be no stored conversation.
    const conversation = await getConversation(sessionId);

    const messages = conversation?.messages;

    // Run the agent using the stored conversation history.
    const result = await runAgent(message, messages);

    // Save the updated conversation back to MongoDB.
    if (result.messages) {
      await saveConversation(sessionId, result.messages);
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
