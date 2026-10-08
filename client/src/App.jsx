import { useEffect, useState } from "react";
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

      // Add the agent's response to the chat.
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content: data.message || data.error || "No response received.",
        },
      ]);
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

            <p>{message.content}</p>
          </div>
        ))}

        {loading && (
          <div className="message assistant">
            <strong>Agent</strong>
            <p>Thinking...</p>
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
