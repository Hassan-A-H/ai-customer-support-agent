import db from "./db.js";

const conversations = db.collection("conversations");

// Load an existing conversation using its session ID.
// Returns null when the session does not exist yet.
export async function getConversation(sessionId) {
  return await conversations.findOne({
    sessionId,
  });
}

// Save the latest message history for a session.
// updateOne with upsert lets us create the conversation
// if it doesn't exist, or update it if it already exists.
export async function saveConversation(sessionId, messages) {
  await conversations.updateOne(
    { sessionId },
    {
      $set: {
        messages,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
}
