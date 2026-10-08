import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./App.css";

function App() {
  // Get the existing browser session ID.
  // If this is the first visit, create and save a new one.
  let sessionId = localStorage.getItem("ai-agent-session-id");

  if (!sessionId) {
    sessionId = crypto.randomUUID();

    localStorage.setItem("ai-agent-session-id", sessionId);
  }

  // Stores all messages currently displayed in the chat.
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! How can I help you today?",
    },
  ]);

  // Load the previous conversation from MongoDB when the app starts.
  useEffect(() => {
    async function loadConversation() {
      try {
        const response = await fetch(`/api/conversation/${sessionId}`);

        const data = await response.json();

        // Only replace the initial greeting when MongoDB
        // actually contains a previous conversation.
        if (data.messages?.length > 0) {
          setMessages(data.messages);
        }
      } catch (error) {
        console.error("Failed to load conversation:", error);
      }
    }

    loadConversation();
  }, [sessionId]);

  // Stores what the user is currently typing.
  const [input, setInput] = useState("");

  // Prevents the user from sending another message
  // while the agent is processing the current one.
  const [loading, setLoading] = useState(false);

  // Stores a sensitive action that is waiting for human approval.
  const [pendingApproval, setPendingApproval] = useState(null);

  async function handleSend() {
    // Ignore empty messages or messages sent while waiting
    // for the backend response.
    if (!input.trim() || loading) {
      return;
    }

    const userMessage = input.trim();

    // Immediately show the user's message in the UI.
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        role: "user",
        content: userMessage,
      },
    ]);

    // Clear the input field.
    setInput("");

    // Show that the agent is processing the request.
    setLoading(true);

    try {
      // Send the user's message to our Express API.
      const response = await fetch("/api/chat", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          // Send this browser session's ID to the backend
          // so MongoDB can store the conversation separately.
          sessionId,
          message: userMessage,
        }),
      });

      const data = await response.json();

      // If the agent wants to perform a sensitive action,
      // keep the action details in React state so the UI
      // can ask the human for approval.
      if (data.requiresApproval) {
        // Show a normal assistant message explaining why
        // the approval card appeared.
        setMessages((currentMessages) => [
          ...currentMessages,
          {
            role: "assistant",
            content:
              `I need your approval to perform ${data.action} ` +
              `for order ${data.arguments.orderId}.`,
          },
        ]);

        setPendingApproval({
          action: data.action,
          arguments: data.arguments,
          toolCallId: data.toolCallId,
        });
      } else {
        // Normal agent response.
        setMessages((currentMessages) => [
          ...currentMessages,
          {
            role: "assistant",
            content: data.message || data.error || "No response received.",
          },
        ]);
      }
    } catch (error) {
      // Handle network/API errors so the UI doesn't silently fail.
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content: "Sorry, I couldn't connect to the server.",
        },
      ]);

      console.error("Chat request failed:", error);
    } finally {
      // Allow the user to send another message.
      setLoading(false);
    }
  }

  async function handleApproval() {
    if (!pendingApproval || loading) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/approval", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // The server already knows which action is pending.
          // We only tell it which conversation is approving it.
          sessionId,
        }),
      });

      const data = await response.json();

      // The approval request has now been handled,
      // so remove the approval card from the UI.
      setPendingApproval(null);

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content: data.message || data.error || "No response received.",
        },
      ]);
    } catch (error) {
      console.error("Approval request failed:", error);

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content: "Sorry, I couldn't process the approval.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1>AI Customer Support</h1>
        <p>Ask me about your orders, products, and policies.</p>
      </header>

      <main className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            <strong>{message.role === "user" ? "You" : "Agent"}</strong>

            <div className="message-content">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          </div>
        ))}

        {loading && (
          <div className="message assistant">
            <strong>Agent</strong>
            <p>Thinking...</p>
          </div>
        )}

        {pendingApproval && (
          <div className="approval-card">
            <strong>⚠️ Approval required</strong>

            <p>
              The agent wants to perform:
              <strong> {pendingApproval.action}</strong>
            </p>

            <p>
              Order ID: <strong>{pendingApproval.arguments.orderId}</strong>
            </p>

            <div className="approval-actions">
              <button type="button" onClick={handleApproval}>
                Approve
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const response = await fetch("/api/approval/reject", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        // The server uses the session ID to find the
                        // pending approval stored in MongoDB.
                        sessionId,
                      }),
                    });

                    const data = await response.json();

                    // Remove the approval card from the UI.
                    setPendingApproval(null);

                    // Tell the user what happened.
                    setMessages((currentMessages) => [
                      ...currentMessages,
                      {
                        role: "assistant",
                        content:
                          data.message ||
                          data.error ||
                          "The cancellation request was rejected.",
                      },
                    ]);
                  } catch (error) {
                    console.error("Approval rejection failed:", error);
                  }
                }}
              >
                Reject
              </button>
            </div>
          </div>
        )}
      </main>

      <div className="chat-input">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSend();
            }
          }}
          placeholder="Type your message..."
          disabled={loading}
        />

        <button type="button" onClick={handleSend} disabled={loading}>
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}

export default App;
