import { retrieveRelevantPolicies } from "./retrieve.js";

// Test cases used to evaluate the quality of our RAG retrieval.
// "expected" is the policy we expect the retriever to find.
const testCases = [
  {
    query: "How many days do I have to return a product?",
    expected: "return_policy",
  },
  {
    query: "My product arrived damaged. Do I have to pay for return shipping?",
    expected: "return_policy",
  },
  {
    query: "How long does it take to get my money back?",
    expected: "refund_policy",
  },
  {
    query: "How long does shipping usually take?",
    expected: "shipping_policy",
  },
  {
    query: "Can I cancel my order while it is being processed?",
    expected: "cancellation_policy",
  },
  {
    // This query is intentionally unrelated to our policies.
    // We expect the retriever to return no relevant documents.
    query: "What is the weather like today?",
    expected: null,
  },
];

// Counters used to measure retrieval performance.
let top1Correct = 0;
let topKCorrect = 0;

for (const testCase of testCases) {
  console.log("\n================================");
  console.log("Query:", testCase.query);
  console.log("Expected:", testCase.expected);

  // Ask our RAG system to retrieve the most relevant policies.
  const results = await retrieveRelevantPolicies(testCase.query);

  // Display the retrieved policies and their similarity scores.
  for (const [index, result] of results.entries()) {
    console.log(
      `${index + 1}. ${result.id} (${result.similarity.toFixed(3)})`
    );
  }

  // Handle queries where we expect no relevant policy.
  if (!testCase.expected) {
    if (results.length === 0) {
      console.log("✅ Correctly returned no relevant documents");
    } else {
      console.log("❌ Returned documents for an unrelated query");
    }

    // Move to the next test case.
    continue;
  }

  // Check whether the first retrieved document is the expected one.
  const topResult = results[0];

  if (topResult?.id === testCase.expected) {
    top1Correct++;
    console.log("✅ Top-1 correct");
  } else {
    console.log("❌ Top-1 incorrect");
  }

  // Check whether the expected document appears anywhere
  // in the retrieved results.
  //
  // This is important because our RAG system retrieves multiple
  // documents and sends them to the LLM.
  const foundInTopK = results.some(
    (result) => result.id === testCase.expected
  );

  if (foundInTopK) {
    topKCorrect++;
    console.log("✅ Correct document found in retrieved results");
  } else {
    console.log("❌ Correct document was not retrieved");
  }
}

// The unrelated test case does not count toward retrieval accuracy.
const relevantTestCases = testCases.filter(
  (testCase) => testCase.expected !== null
);

console.log("\n================================");
console.log("Evaluation Summary");

// Top-1 accuracy measures how often the correct document
// was ranked as the #1 result.
console.log(
  `Top-1 accuracy: ${top1Correct}/${relevantTestCases.length}`
);

// Top-K recall measures how often the correct document
// appeared anywhere in the retrieved results.
console.log(
  `Top-K recall: ${topKCorrect}/${relevantTestCases.length}`
);
