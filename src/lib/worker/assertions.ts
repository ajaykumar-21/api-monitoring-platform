export type AssertionTarget =
  | "body_json"
  | "body_text"
  | "header"
  | "response_time";

export type AssertionOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "CONTAINS"
  | "NOT_CONTAINS"
  | "GREATER_THAN"
  | "LESS_THAN"
  | "EXISTS"
  | "NOT_EXISTS"
  | "IS_EMPTY"
  | "IS_NOT_EMPTY"
  | "REGEX_MATCH";

export interface AssertionRule {
  id: string;
  target: AssertionTarget;
  property?: string; // e.g. "status", "data.user.id", "items[0].name", "content-type"
  operator: AssertionOperator;
  value?: string; // Target value for comparison
}

export interface AssertionContext {
  statusCode: number | null;
  responseTimeMs: number;
  headers: Record<string, string | string[] | undefined>;
  rawBody: string;
  jsonBody: any;
}

export interface AssertionResult {
  passed: boolean;
  rule: AssertionRule;
  actualValue?: any;
  message: string;
}

/**
 * Safely resolves nested properties using dot notation and array index notation.
 * e.g., "data.users[0].name" or "status.code" or "items.0.id"
 */
export function getNestedProperty(obj: any, path: string): any {
  if (obj === null || obj === undefined || !path) {
    return undefined;
  }

  // Normalize path notation: convert "a[0].b" to "a.0.b"
  const normalizedPath = path.replace(/\[(\w+)\]/g, ".$1").replace(/^\./, "");
  const keys = normalizedPath.split(".");

  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }

  return current;
}

/**
 * Parses a string representation into typed primitives (boolean, number, null, string)
 * when appropriate for comparison.
 */
function parseValueForComparison(
  expectedValStr: string | undefined,
  actualVal: any,
): any {
  if (expectedValStr === undefined) return undefined;
  const trimmed = expectedValStr.trim();

  // If actual is a boolean or expected is strictly boolean string
  if (
    typeof actualVal === "boolean" ||
    trimmed === "true" ||
    trimmed === "false"
  ) {
    if (trimmed.toLowerCase() === "true") return true;
    if (trimmed.toLowerCase() === "false") return false;
  }

  // If actual is a number, try parsing expected to number
  if (
    typeof actualVal === "number" ||
    (!isNaN(Number(trimmed)) && trimmed !== "")
  ) {
    const num = Number(trimmed);
    if (!isNaN(num)) return num;
  }

  // If expected is null string
  if (trimmed === "null" && actualVal === null) {
    return null;
  }

  return expectedValStr;
}

/**
 * Evaluates a single assertion rule against the HTTP response context.
 */
export function evaluateAssertion(
  rule: AssertionRule,
  context: AssertionContext,
): AssertionResult {
  let actualValue: any;
  let targetDescription = "";

  switch (rule.target) {
    case "body_json": {
      const prop = rule.property || "";
      targetDescription = prop
        ? `JSON property "${prop}"`
        : "JSON response body";
      if (context.jsonBody === undefined || context.jsonBody === null) {
        return {
          passed: false,
          rule,
          actualValue: null,
          message: `${targetDescription} failed: Response body is not valid JSON.`,
        };
      }
      actualValue = prop
        ? getNestedProperty(context.jsonBody, prop)
        : context.jsonBody;
      break;
    }

    case "body_text": {
      targetDescription = "Response text body";
      actualValue = context.rawBody || "";
      break;
    }

    case "header": {
      const headerKey = (rule.property || "").toLowerCase();
      targetDescription = `Response header "${rule.property || ""}"`;
      // Headers in node/axios are usually lowercase
      const headersObj = context.headers || {};
      const foundKey = Object.keys(headersObj).find(
        (k) => k.toLowerCase() === headerKey,
      );
      actualValue = foundKey ? headersObj[foundKey] : undefined;
      break;
    }

    case "response_time": {
      targetDescription = "Response latency";
      actualValue = context.responseTimeMs;
      break;
    }

    default:
      return {
        passed: false,
        rule,
        actualValue: undefined,
        message: `Unknown assertion target: ${(rule as any).target}`,
      };
  }

  const expectedParsed = parseValueForComparison(rule.value, actualValue);

  let passed = false;
  let detailMessage = "";

  switch (rule.operator) {
    case "EQUALS": {
      if (typeof actualValue === "object" && actualValue !== null) {
        passed = JSON.stringify(actualValue) === JSON.stringify(expectedParsed);
      } else {
        // Loose equality for string/number match or strict match
        passed =
          actualValue === expectedParsed ||
          String(actualValue) === String(rule.value);
      }
      detailMessage = passed
        ? `${targetDescription} equals "${rule.value}"`
        : `${targetDescription} expected "${rule.value}", but received "${String(actualValue)}"`;
      break;
    }

    case "NOT_EQUALS": {
      if (typeof actualValue === "object" && actualValue !== null) {
        passed = JSON.stringify(actualValue) !== JSON.stringify(expectedParsed);
      } else {
        passed =
          actualValue !== expectedParsed &&
          String(actualValue) !== String(rule.value);
      }
      detailMessage = passed
        ? `${targetDescription} does not equal "${rule.value}"`
        : `${targetDescription} expected NOT "${rule.value}", but matched`;
      break;
    }

    case "CONTAINS": {
      const actualStr =
        typeof actualValue === "object"
          ? JSON.stringify(actualValue)
          : String(actualValue ?? "");
      const expectedSubstr = rule.value ?? "";
      passed = actualStr.includes(expectedSubstr);
      detailMessage = passed
        ? `${targetDescription} contains "${expectedSubstr}"`
        : `${targetDescription} does not contain "${expectedSubstr}"`;
      break;
    }

    case "NOT_CONTAINS": {
      const actualStr =
        typeof actualValue === "object"
          ? JSON.stringify(actualValue)
          : String(actualValue ?? "");
      const expectedSubstr = rule.value ?? "";
      passed = !actualStr.includes(expectedSubstr);
      detailMessage = passed
        ? `${targetDescription} does not contain "${expectedSubstr}"`
        : `${targetDescription} unexpectedly contains "${expectedSubstr}"`;
      break;
    }

    case "GREATER_THAN": {
      const actualNum = Number(actualValue);
      const expectedNum = Number(rule.value);
      passed =
        !isNaN(actualNum) && !isNaN(expectedNum) && actualNum > expectedNum;
      detailMessage = passed
        ? `${targetDescription} (${actualNum}) > ${expectedNum}`
        : `${targetDescription} expected > ${expectedNum}, but received ${actualValue}`;
      break;
    }

    case "LESS_THAN": {
      const actualNum = Number(actualValue);
      const expectedNum = Number(rule.value);
      passed =
        !isNaN(actualNum) && !isNaN(expectedNum) && actualNum < expectedNum;
      detailMessage = passed
        ? `${targetDescription} (${actualNum}) < ${expectedNum}`
        : `${targetDescription} expected < ${expectedNum}, but received ${actualValue}`;
      break;
    }

    case "EXISTS": {
      passed = actualValue !== undefined && actualValue !== null;
      detailMessage = passed
        ? `${targetDescription} exists`
        : `${targetDescription} does not exist in response`;
      break;
    }

    case "NOT_EXISTS": {
      passed = actualValue === undefined || actualValue === null;
      detailMessage = passed
        ? `${targetDescription} does not exist (as expected)`
        : `${targetDescription} unexpectedly exists with value "${String(actualValue)}"`;
      break;
    }

    case "IS_EMPTY": {
      if (Array.isArray(actualValue)) {
        passed = actualValue.length === 0;
      } else if (typeof actualValue === "string") {
        passed = actualValue.trim().length === 0;
      } else if (typeof actualValue === "object" && actualValue !== null) {
        passed = Object.keys(actualValue).length === 0;
      } else {
        passed = !actualValue;
      }
      detailMessage = passed
        ? `${targetDescription} is empty`
        : `${targetDescription} is not empty`;
      break;
    }

    case "IS_NOT_EMPTY": {
      if (Array.isArray(actualValue)) {
        passed = actualValue.length > 0;
      } else if (typeof actualValue === "string") {
        passed = actualValue.trim().length > 0;
      } else if (typeof actualValue === "object" && actualValue !== null) {
        passed = Object.keys(actualValue).length > 0;
      } else {
        passed = Boolean(actualValue);
      }
      detailMessage = passed
        ? `${targetDescription} is not empty`
        : `${targetDescription} is empty`;
      break;
    }

    case "REGEX_MATCH": {
      try {
        const regex = new RegExp(rule.value || "", "i");
        const strVal =
          typeof actualValue === "object"
            ? JSON.stringify(actualValue)
            : String(actualValue ?? "");
        passed = regex.test(strVal);
        detailMessage = passed
          ? `${targetDescription} matches regex /${rule.value}/`
          : `${targetDescription} does not match regex /${rule.value}/`;
      } catch (e: any) {
        passed = false;
        detailMessage = `Invalid regex pattern: ${rule.value}`;
      }
      break;
    }

    default:
      passed = false;
      detailMessage = `Unsupported operator: ${rule.operator}`;
  }

  return {
    passed,
    rule,
    actualValue,
    message: detailMessage,
  };
}

/**
 * Evaluates all assertions configured for a monitor.
 */
export function evaluateAllAssertions(
  rules: AssertionRule[],
  context: AssertionContext,
): { allPassed: boolean; failedReasons: string[]; results: AssertionResult[] } {
  if (!rules || rules.length === 0) {
    return { allPassed: true, failedReasons: [], results: [] };
  }

  const results: AssertionResult[] = [];
  const failedReasons: string[] = [];

  for (const rule of rules) {
    const result = evaluateAssertion(rule, context);
    results.push(result);
    if (!result.passed) {
      failedReasons.push(result.message);
    }
  }

  return {
    allPassed: failedReasons.length === 0,
    failedReasons,
    results,
  };
}
