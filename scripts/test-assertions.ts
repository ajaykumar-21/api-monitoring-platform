import {
  evaluateAssertion,
  evaluateAllAssertions,
  getNestedProperty,
  AssertionRule,
  AssertionContext,
} from "../src/lib/worker/assertions";

function runTests() {
  console.log("🧪 Starting JSON & Response Assertion Engine Tests...\n");
  let passedCount = 0;
  let failedCount = 0;

  function assert(name: string, condition: boolean, details?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passedCount++;
    } else {
      console.error(`  ❌ FAIL: ${name}`, details || "");
      failedCount++;
    }
  }

  // 1. Nested Property Resolution
  console.log("1. Testing Property Path Resolution (Dot Notation & Arrays):");
  const testObj = {
    status: "ok",
    code: 200,
    success: true,
    data: {
      users: [
        { id: 101, name: "Alice", role: "admin", active: true },
        { id: 102, name: "Bob", role: "viewer", active: false },
      ],
      metrics: {
        rps: 450,
        tags: ["prod", "v2"],
      },
    },
  };

  assert("Direct root property", getNestedProperty(testObj, "status") === "ok");
  assert(
    "Nested object property",
    getNestedProperty(testObj, "data.metrics.rps") === 450,
  );
  assert(
    "Array index notation [0]",
    getNestedProperty(testObj, "data.users[0].name") === "Alice",
  );
  assert(
    "Array index dot notation .0",
    getNestedProperty(testObj, "data.users.1.role") === "viewer",
  );
  assert(
    "Array element array access",
    getNestedProperty(testObj, "data.metrics.tags[1]") === "v2",
  );
  assert(
    "Non-existent property returns undefined",
    getNestedProperty(testObj, "data.unknown.field") === undefined,
  );

  // 2. JSON Assertions
  console.log("\n2. Testing JSON Body Assertions:");
  const sampleContext: AssertionContext = {
    statusCode: 200,
    responseTimeMs: 240,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-cache": "HIT",
    },
    rawBody: JSON.stringify(testObj),
    jsonBody: testObj,
  };

  const jsonEqualsRule: AssertionRule = {
    id: "r1",
    target: "body_json",
    property: "status",
    operator: "EQUALS",
    value: "ok",
  };
  assert(
    "JSON status equals 'ok'",
    evaluateAssertion(jsonEqualsRule, sampleContext).passed === true,
  );

  const jsonBooleanRule: AssertionRule = {
    id: "r2",
    target: "body_json",
    property: "success",
    operator: "EQUALS",
    value: "true",
  };
  assert(
    "JSON success equals true (boolean coercion)",
    evaluateAssertion(jsonBooleanRule, sampleContext).passed === true,
  );

  const jsonNumberRule: AssertionRule = {
    id: "r3",
    target: "body_json",
    property: "data.metrics.rps",
    operator: "GREATER_THAN",
    value: "400",
  };
  assert(
    "JSON nested number > 400",
    evaluateAssertion(jsonNumberRule, sampleContext).passed === true,
  );

  const jsonContainsRule: AssertionRule = {
    id: "r4",
    target: "body_json",
    property: "data.users[0].name",
    operator: "CONTAINS",
    value: "Ali",
  };
  assert(
    "JSON string contains substring",
    evaluateAssertion(jsonContainsRule, sampleContext).passed === true,
  );

  const jsonExistsRule: AssertionRule = {
    id: "r5",
    target: "body_json",
    property: "data.metrics",
    operator: "EXISTS",
  };
  assert(
    "JSON property exists",
    evaluateAssertion(jsonExistsRule, sampleContext).passed === true,
  );

  const jsonNotExistsRule: AssertionRule = {
    id: "r6",
    target: "body_json",
    property: "data.invalid",
    operator: "NOT_EXISTS",
  };
  assert(
    "JSON property does not exist",
    evaluateAssertion(jsonNotExistsRule, sampleContext).passed === true,
  );

  // 3. Header Assertions
  console.log("\n3. Testing Header & Latency Assertions:");
  const headerRule: AssertionRule = {
    id: "r7",
    target: "header",
    property: "content-type",
    operator: "CONTAINS",
    value: "application/json",
  };
  assert(
    "Header content-type contains application/json",
    evaluateAssertion(headerRule, sampleContext).passed === true,
  );

  const latencyRule: AssertionRule = {
    id: "r8",
    target: "response_time",
    operator: "LESS_THAN",
    value: "500",
  };
  assert(
    "Response time 240ms < 500ms",
    evaluateAssertion(latencyRule, sampleContext).passed === true,
  );

  const failingLatencyRule: AssertionRule = {
    id: "r9",
    target: "response_time",
    operator: "LESS_THAN",
    value: "100",
  };
  assert(
    "Response time 240ms < 100ms fails correctly",
    evaluateAssertion(failingLatencyRule, sampleContext).passed === false,
  );

  // 4. Batch Assertion Evaluation
  console.log("\n4. Testing evaluateAllAssertions batch evaluation:");
  const batch1 = evaluateAllAssertions(
    [jsonEqualsRule, jsonBooleanRule, headerRule, latencyRule],
    sampleContext,
  );
  assert(
    "All valid rules return allPassed: true",
    batch1.allPassed === true && batch1.failedReasons.length === 0,
  );

  const batch2 = evaluateAllAssertions(
    [jsonEqualsRule, failingLatencyRule],
    sampleContext,
  );
  assert(
    "Failing latency in batch returns allPassed: false",
    batch2.allPassed === false && batch2.failedReasons.length === 1,
  );

  console.log(`\n========================================`);
  console.log(
    `🏁 Assertion Engine Test Results: ${passedCount} passed, ${failedCount} failed.`,
  );
  console.log(`========================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
