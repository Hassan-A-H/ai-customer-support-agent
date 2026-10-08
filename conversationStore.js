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

// Store a sensitive action that is waiting for human approval.
//
// The important point is that the server stores the action itself.
// The browser does not become the source of truth for what should
// be executed.
export async function savePendingApproval(sessionId, approval) {
  await conversations.updateOne(
    { sessionId },
    {
      $set: {
        pendingApproval: approval,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
}

// Remove the pending approval after it has either been approved
// or rejected.
export async function clearPendingApproval(sessionId) {
  await conversations.updateOne(
    { sessionId },
    {
      $unset: {
        pendingApproval: "",
      },
      $set: {
        updatedAt: new Date(),
      },
    },
  );
}
