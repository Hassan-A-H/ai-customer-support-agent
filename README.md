# ShopAssist AI

An AI-powered customer support agent for small online shops, built with Node.js, tool calling, Retrieval-Augmented Generation (RAG), MongoDB, and a React frontend.

This project is mainly a learning project for understanding how AI agents work internally and how an LLM can safely interact with application tools and business data, rather than relying completely on an agent framework.

## Project Goal

The goal is to build an AI agent that can help customers of a small online shop with tasks such as:

- Answering questions about return, refund, shipping, and cancellation policies
- Checking customer information
- Checking order information
- Searching the product catalog
- Retrieving relevant company policies using semantic search
- Creating support tickets
- Performing sensitive actions only after human approval
- Maintaining conversation state

The project is designed around a practical customer-support workflow where an AI agent can automate repetitive tasks while keeping sensitive business actions under application control.

## Architecture

The current system follows this general flow:

```text
User
  ↓
React Frontend
  ↓
Express API
  ↓
AI Agent
  ↓
LLM Provider Layer
  ↓
LLM
  ↓
Tool Calling
  ↓
Tools / RAG
  ↓
Business Data
  ↓
Tool Result
  ↓
LLM
  ↓
Final Answer
```

The Node.js application acts as the orchestrator.

The LLM decides which tool should be used, while the Node.js application executes the actual tool. The application also controls permissions for sensitive actions instead of relying only on the LLM.

## Agent Loop

The agent follows this general process:

```text
User Goal
   ↓
LLM decides what to do
   ↓
Does it need a tool?
   │
   ├── No ──→ Final response
   │
   └── Yes
          ↓
      Tool request
          ↓
      Application
          ↓
      Tool execution
          ↓
      Tool result
          ↓
      LLM
          ↓
      Final response
```

This project intentionally implements this process without using an agent framework such as LangChain, CrewAI, or AutoGen.

The goal is to understand how the core mechanism works internally.

## Tools

The agent currently has access to application tools for:

### Customer Information

`get_customer`

Retrieves customer information from the application data.

### Order Information

`get_order`

Retrieves information about a specific order.

### Product Search

`search_products`

Searches the product catalog.

### Policy Search

`search_policy`

Uses the RAG pipeline to retrieve relevant company policies.

### Support Tickets

`create_support_ticket`

Creates a support ticket for a customer issue.

### Order Cancellation

`cancel_order`

Changes an eligible order from `processing` to `cancelled`.

This is treated as a sensitive action and requires human approval.

The project also contains general-purpose tools such as `calculate`, `get_current_time`, and `get_weather`.

## Human Approval

One of the important design decisions in this project is that the LLM is not trusted to directly perform sensitive business actions.

For example:

```text
User
  ↓
"Cancel order O1002"
  ↓
Application detects sensitive action
  ↓
Human approval requested
  ↓
Approved?
  ├── No  → Action rejected
  │
  └── Yes → cancel_order executed
                  ↓
             Order updated
```

The browser is not treated as the source of truth for the pending action. The server stores the pending approval state in MongoDB.

This creates an application-level permission boundary around sensitive operations.

If an order cannot be cancelled, the application returns the actual tool error instead of allowing the agent to invent a successful result.

## Conversation State

Conversation history is persisted using MongoDB.

Each conversation is associated with a session ID.

The stored state includes:

- Conversation messages
- Pending approval information
- Updated timestamp

This allows the application to restore a conversation instead of treating every request as a completely new interaction.

## Retrieval-Augmented Generation

ShopAssist AI uses Retrieval-Augmented Generation (RAG) for company policies.

The policy documents are stored in:

```text
data/policies.json
```

The current RAG pipeline works as follows:

```text
Policy documents
      ↓
Split documents into chunks
      ↓
Create embeddings
      ↓
Store embeddings
      ↓
User question
      ↓
Create query embedding
      ↓
Calculate cosine similarity
      ↓
Apply relevance threshold
      ↓
Group relevant chunks by policy
      ↓
Rank policies
      ↓
Return relevant policies
      ↓
LLM uses retrieved information
```

### Embeddings

An embedding represents text as a numerical vector.

Similar meanings should produce vectors that are closer together.

For example:

```text
"How long can I return a product?"
```

and:

```text
"What is the return period?"
```

can use different words while having similar meanings.

Embeddings allow the system to find this semantic relationship.

### Cosine Similarity

The project uses cosine similarity to compare the query embedding with the embeddings of stored policy chunks.

A higher score means the vectors are more similar.

### Relevance Threshold

The retrieval system does not simply return the most similar document.

It also applies a minimum similarity threshold.

This is important because a similarity search will always be able to find a closest document, even when none of the available documents are actually relevant.

For example, an unrelated question such as:

```text
What is the weather today?
```

should not automatically produce a shipping or return policy simply because one happens to be the closest result.

## Retrieval Evaluation

The project contains a small evaluation script:

```bash
node rag/evaluateRetrieval.js
```

The evaluation currently tests questions about:

- Returns
- Damaged products
- Refunds
- Shipping
- Cancellation
- Unrelated questions

The current evaluation achieved:

```text
Top-1 accuracy: 5/5
Top-K recall:   5/5
```

The evaluation is intentionally small at this stage and can be expanded as the system becomes more realistic.

## LLM Provider Fallback

The application does not depend on a single LLM provider.

The provider layer currently supports:

1. OpenRouter
2. Google Gemini
3. Groq

The providers are attempted in order:

```text
OpenRouter
    ↓
failure
    ↓
Gemini
    ↓
failure
    ↓
Groq
```

The actual provider used depends on API-key configuration and provider availability.

## Backend API

The backend is implemented using Express.

The main API endpoints include:

```text
GET  /api/conversation/:sessionId
POST /api/chat
POST /api/approval
POST /api/approval/reject
```

The server is responsible for:

- Managing conversations
- Running the agent
- Executing tools
- Managing human approval
- Persisting conversation state
- Communicating with MongoDB

## Database

MongoDB is used for application state, including conversation history and pending approval information.

The example shop data remains simple JSON files so that the agent architecture is easy to understand:

```text
data/
├── customers.json
├── orders.json
├── policies.json
├── products.json
└── tickets.json
```

MongoDB is run locally in Docker during development.

## Technology Stack

### Frontend

- React
- Vite
- React Markdown
- CSS

### Backend

- Node.js
- Express
- JavaScript
- MongoDB
- Docker

### AI

- LLM tool calling
- OpenRouter
- Google Gemini
- Groq
- Embeddings
- Cosine similarity
- Retrieval-Augmented Generation (RAG)

### Development

- Git
- GitHub
- WSL2
- Linux
- Docker

The agent itself is implemented without LangChain, CrewAI, AutoGen, or another agent framework.

## Project Structure

```text
ai-agent-basics/
│
├── client/
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── ...
│
├── data/
│   ├── customers.json
│   ├── orders.json
│   ├── policies.json
│   ├── policyEmbeddings.json
│   ├── products.json
│   └── tickets.json
│
├── llm/
│   ├── generate.js
│   └── providers/
│       ├── openrouter.js
│       ├── gemini.js
│       └── groq.js
│
├── rag/
│   ├── documents.js
│   ├── embeddings.js
│   ├── indexDocuments.js
│   ├── retrieve.js
│   ├── similarity.js
│   ├── evaluateRetrieval.js
│   └── test*.js
│
├── tools/
│   ├── calculate.js
│   ├── cancelOrder.js
│   ├── createSupportTicket.js
│   ├── getCurrentTime.js
│   ├── getCustomer.js
│   ├── getOrder.js
│   ├── getWeather.js
│   ├── requestApproval.js
│   ├── searchPolicy.js
│   └── searchProducts.js
│
├── agent.js
├── conversationStore.js
├── db.js
├── index.js
├── server.js
├── package.json
├── .env.example
└── README.md
```

## Setup

### Requirements

You need:

- Node.js
- npm
- Docker
- MongoDB running locally
- API keys for the configured LLM providers

### 1. Clone the repository

```bash
git clone https://github.com/Hassan-A-H/ai-customer-support-agent.git
cd ai-customer-support-agent
```

### 2. Install backend dependencies

```bash
npm install
```

### 3. Install frontend dependencies

```bash
cd client
npm install
cd ..
```

### 4. Create the environment file

Create a `.env` file in the project root.

Use `.env.example` as a template.

The project supports API keys for the configured providers, including:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

Do not commit the `.env` file to Git.

## Start MongoDB

The development setup uses MongoDB in Docker.

Create the MongoDB container if it does not already exist:

```bash
docker run -d \
  --name ai-agent-mongodb \
  -p 27017:27017 \
  -v ai-agent-mongodb-data:/data/db \
  mongo:8
```

If the container already exists after a restart:

```bash
docker start ai-agent-mongodb
```

## Generate Policy Embeddings

Before using policy retrieval, generate the policy embeddings:

```bash
node rag/indexDocuments.js
```

This reads the policies from:

```text
data/policies.json
```

and generates:

```text
data/policyEmbeddings.json
```

The generated file contains the policy chunks together with their embedding vectors.

## Start the Backend

From the project root:

```bash
node server.js
```

The backend runs on:

```text
http://localhost:3000
```

## Start the React Frontend

In another terminal:

```bash
cd client
npm run dev
```

Vite will display the local development URL.

Open that URL in your browser.

## Example Demo Scenarios

### 1. Policy Question

```text
Can I return my keyboard within 30 days?
```

Expected flow:

```text
User question
     ↓
RAG retrieval
     ↓
Relevant return policy
     ↓
LLM answer
```

### 2. Order Lookup

```text
Where is my order O1001?
```

Expected flow:

```text
User
 ↓
LLM decides get_order is needed
 ↓
get_order
 ↓
orders.json
 ↓
Order information
 ↓
LLM response
```

### 3. Product Search

```text
Do you have any wireless keyboards?
```

The agent can use the product search tool to search the product catalog.

### 4. Support Ticket

```text
I have a problem with my order O1003.
Please create a support ticket.
```

The agent can create a support ticket using the application tool.

### 5. Sensitive Action

```text
Cancel order O1002
```

The application should request human approval before executing the cancellation.

After approval:

```text
cancel_order
      ↓
orders.json
      ↓
status = cancelled
```

### 6. Invalid Cancellation

```text
Cancel order O1001
```

If the order is already shipped, the application rejects the action instead of allowing the agent to modify the order incorrectly.

## Business Impact

The project is designed around a practical SME customer-support problem: reducing the amount of repetitive support work required from employees.

Potential impact can be measured using metrics such as:

- Number of support requests handled automatically
- Average support resolution time
- Human intervention rate
- Number of support tickets created automatically
- Operational cost per support request
- Percentage of customer questions answered without human intervention
- Product discovery and conversion rate

This prototype does not claim real-world revenue or cost savings because it has not been deployed with a real business and does not have production traffic data.

The architecture is designed so that these metrics could be measured after deployment.

## Security and Reliability Considerations

The project intentionally separates LLM decisions from application permissions.

The LLM can request an action, but the application controls whether that action can actually execute.

For sensitive actions:

```text
LLM request
    ↓
Application validation
    ↓
Human approval
    ↓
Tool execution
```

The application also treats tool results as authoritative and avoids allowing the model to invent information that is not present in returned data.

## Current Limitations

This is a prototype designed for learning and demonstration.

Current limitations include:

- Business data is simplified
- JSON files are used for example shop data
- The application is not production deployed
- There is no authentication system
- There is no role-based access control
- The RAG evaluation dataset is small
- Embeddings are generated locally rather than using a production vector database
- The human approval system is designed for the current prototype rather than a full enterprise approval system
- Provider availability depends on external APIs and API keys
- Production observability and monitoring are limited

## Future Improvements

Possible future improvements include:

1. Authentication and authorization
2. Role-based permissions
3. Production database for business data
4. Vector database for larger knowledge bases
5. Larger RAG evaluation datasets
6. Automated end-to-end testing
7. Agent tracing and observability
8. Production deployment
9. Better analytics and business-impact measurement
10. Integration with real e-commerce platforms
11. Additional approval workflows
12. More advanced customer and sales workflows

## Learning Objectives

The main goal of this project is to understand AI agents from the inside rather than simply using an agent framework.

The project covers:

- How an LLM interacts with an application
- How tool calling works
- How the application executes tools
- How an agent loop works
- How conversation state is maintained
- How RAG works
- How embeddings represent semantic meaning
- How cosine similarity works
- How retrieval can be evaluated
- How an LLM can interact with business data
- Why application-level permissions are important
- How human-in-the-loop approval can protect sensitive actions
- How an AI application can be structured as a real software system

The project intentionally starts with simple components before introducing frameworks or more complex infrastructure.

## Author

Built by **Hassan Ahmed** as an AI agent learning project and hackathon submission.

The project was developed from scratch with the goal of understanding the architecture and implementation of AI agents rather than relying entirely on an agent framework.
