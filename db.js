import { MongoClient } from "mongodb";

// MongoDB is running in Docker and exposed on localhost:27017.
const uri = "mongodb://localhost:27017";

// Create one reusable MongoDB client for the application.
const client = new MongoClient(uri);

// Establish the connection when the application starts.
await client.connect();

console.log("Connected to MongoDB.");

const db = client.db("ai_agent");

export default db;
