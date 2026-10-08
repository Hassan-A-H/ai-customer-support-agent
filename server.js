import express from "express";
import { runAgent, resumeApprovedAction } from "./agent.js";
import {
  getConversation,
  saveConversation,
  savePendingApproval,
  clearPendingApproval,
} from "./conversationStore.js";

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

    // If the agent paused because a sensitive action needs approval,
    // store the exact action on the server.
    //
    // The browser can display this information, but the server remains
    // the source of truth for what will eventually be executed.
    if (result.requiresApproval) {
      await savePendingApproval(sessionId, {
        action: result.action,
        arguments: result.arguments,
        toolCallId: result.toolCallId,
      });
    }

    res.json({
      success: result.success,
      message: result.message ?? "",
      requiresApproval: result.requiresApproval ?? false,

      // Send these only when the agent is waiting for
      // human approval of a sensitive action.
      action: result.action ?? null,
      arguments: result.arguments ?? null,
      toolCallId: result.toolCallId ?? null,
    });
  } catch (error) {
    console.error("Agent error:", error);

    res.status(500).json({
      error: "The agent failed to process the request.",
    });
  }
});

// Resume an agent action after the human explicitly approves it.
app.post("/approval", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: "Session ID is required.",
      });
    }

    // Load the conversation and the pending approval stored
    // by the server when the agent paused.
    const conversation = await getConversation(sessionId);

    if (!conversation) {
      return res.status(404).json({
        error: "Conversation not found.",
      });
    }

    if (!conversation.pendingApproval) {
      return res.status(400).json({
        error: "There is no pending approval for this conversation.",
      });
    }

    const {
      action,
      arguments: arguments_,
      toolCallId,
    } = conversation.pendingApproval;

    // Resume the interrupted agent run using the action that
    // the server previously stored.
    const result = await resumeApprovedAction(
      conversation.messages,
      action,
      arguments_,
      toolCallId,
    );

    // Save the completed conversation.
    await saveConversation(sessionId, result.messages);

    // The approval has now been consumed, so remove it.
    await clearPendingApproval(sessionId);

    res.json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    console.error("Approval failed:", error);

    res.status(500).json({
      error: "Failed to execute the approved action.",
    });
  }
});

// Reject a pending sensitive action.
//
// The action is not executed. We simply remove the pending
// approval from the server-side conversation state.
app.post("/approval/reject", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: "Session ID is required.",
      });
    }

    // Make sure the conversation actually exists.
    const conversation = await getConversation(sessionId);

    if (!conversation) {
      return res.status(404).json({
        error: "Conversation not found.",
      });
    }

    // Remove the pending action without executing it.
    await clearPendingApproval(sessionId);

    res.json({
      success: true,
      message: "The pending action was rejected.",
    });
  } catch (error) {
    console.error("Approval rejection failed:", error);

    res.status(500).json({
      error: "Failed to reject the pending action.",
    });
  }
});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
