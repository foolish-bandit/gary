import test from "node:test";
import assert from "node:assert/strict";
import { parseAllowedEmails } from "../src/middleware/auth";

test("parseAllowedEmails returns null for blank input", () => {
  assert.equal(parseAllowedEmails("   "), null);
  assert.equal(parseAllowedEmails(undefined), null);
});

test("parseAllowedEmails normalizes and deduplicates emails", () => {
  const parsed = parseAllowedEmails(
    " A@example.com, b@example.com, a@example.com ",
  );

  assert.ok(parsed instanceof Set);
  assert.deepEqual([...parsed ?? []], ["a@example.com", "b@example.com"]);
});
