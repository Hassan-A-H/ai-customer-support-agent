# AI Customer Support Agent

An AI-powered customer support agent built with Node.js, tool calling, Retrieval-Augmented Generation (RAG), and multiple LLM providers with automatic fallback.

This project is mainly a learning project for understanding how AI agents work internally, rather than relying completely on agent frameworks.

## Project Goal

The goal is to build an AI agent that can help customers of a small online shop with tasks such as:

- Answering questions about return and refund policies
- Checking customer information
- Checking order information
- Searching the product catalog
- Retrieving relevant company policies using semantic search

The project will gradually evolve into a more complete customer-support system.

---

## Architecture

The current system follows this general flow:

```text
User
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

The LLM decides which tool should be used, while the Node.js application executes the actual tool.

---

## Technologies

- Node.js
- JavaScript
- OpenAI SDK
- OpenRouter
- Google Gemini
- Groq
- Tool Calling
- Embeddings
- Cosine Similarity
- Retrieval-Augmented Generation (RAG)
- JSON data storage
- Git / GitHub

---

## Project Structure

```text
ai-agent-basics/
│
├── data/
│   ├── customers.json
│   ├── orders.json
│   ├── policies.json
│   └── products.json
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
│   ├── testChunking.js
│   ├── testEmbedding.js
│   ├── testRetrieval.js
│   └── testSearchPolicy.js
│
├── tools/
│   ├── calculate.js
│   ├── getCurrentTime.js
│   ├── getWeather.js
│   ├── getCustomer.js
│   ├── getOrder.js
│   ├── searchPolicy.js
│   └── searchProducts.js
│
├── .env
├── .env.example
├── .gitignore
├── index.js
├── package.json
└── README.md
```

`policyEmbeddings.json` is generated locally and is not stored in Git.

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/Hassan-A-H/ai-customer-support-agent.git
cd ai-customer-support-agent
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the environment file

Create a `.env` file:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

Do not commit the `.env` file to Git.

---

## LLM Provider Fallback

The application does not depend on a single LLM provider.

The provider layer currently supports:

1. OpenRouter
2. Google Gemini
3. Groq

The providers are attempted in order.

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

---

## Running the Agent

Start the agent with:

```bash
node index.js
```

The agent can answer customer questions and use the available tools and RAG system when necessary.

---

## Generate Policy Embeddings

The RAG system needs embeddings for the policy documents.

Run:

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

The generated file contains each policy together with its embedding vector.

---

## Testing RAG Retrieval

To test semantic retrieval:

```bash
node rag/testRetrieval.js
```

For example:

```text
Query:
Can I return my keyboard within 30 days?

Result:
return_policy
```

The system converts the query into an embedding and compares it with the embeddings of the stored policies.

---

## How RAG Works

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

can have different words but similar meanings.

Embeddings allow the system to find this semantic relationship.

### Cosine Similarity

The project uses cosine similarity to compare the query embedding with each document embedding.

A higher score means the vectors are more similar.

---

## Relevance Threshold

The retrieval system does not simply return the most similar documents.

It also applies a minimum similarity threshold.

For example:

```js
const relevantResults = results.filter(
  (result) => result.similarity >= minSimilarity,
);
```

This is important because a system will always be able to find a "most similar" document, even when none of the documents are actually relevant.

For example:

```text
Question:
What is the weather today?

Possible results:

shipping_policy   0.038
return_policy     0.036
```

These documents are not relevant.

The similarity threshold allows the system to return no results instead.

---

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

The evaluation is intentionally small at this stage and will be expanded as the system becomes more realistic.

---

## Current Limitations

This is currently a learning prototype.

Some limitations include:

- Policies are stored as JSON files
- Customer, order, and product data are stored as JSON files
- Embeddings are generated manually
- There is no vector database
- Retrieval uses a file-based approach
- The relevance threshold is manually configured
- There is no authentication
- There is no production database
- Business actions have not yet been implemented
- There is no human approval workflow
- There is no backend API
- There is no web interface
- Observability and production monitoring are still limited

---

## Planned Improvements

The project will gradually evolve with features such as:

1. Business actions
2. Support ticket creation
3. Human approval for sensitive actions
4. Permission boundaries
5. Backend API
6. React frontend
7. Database integration
8. Conversation state
9. Better observability and logging
10. More realistic business data
11. Automated testing
12. Dockerization
13. Deployment
14. Production-oriented architecture

---

## Learning Objectives

The main purpose of this project is to understand:

- How LLMs interact with applications
- How tool calling works
- How AI agents make decisions
- How tools are executed by the application
- How RAG works
- How embeddings represent semantic meaning
- How vector similarity works
- How retrieval quality can be evaluated
- How agents can safely interact with business systems

The project intentionally starts with simple components before introducing frameworks or more complex infrastructure.
