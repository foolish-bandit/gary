import test from "node:test";
import assert from "node:assert/strict";
import {
  ValidationError,
  normalizeEmailList,
  parseChatMessages,
  parseOptionalEmailArray,
  parseRequiredInteger,
  parseTabularColumnsConfig,
} from "../src/lib/validation";

test("parseTabularColumnsConfig validates and preserves supported fields", () => {
  const columns = parseTabularColumnsConfig([
    {
      index: 0,
      name: "Term",
      prompt: "Extract the term",
      format: "text",
      tags: ["MSA", "NDA"],
    },
  ]);

  assert.equal(columns.length, 1);
  assert.deepEqual(columns[0], {
    index: 0,
    name: "Term",
    prompt: "Extract the term",
    format: "text",
    tags: ["MSA", "NDA"],
  });
});

test("parseTabularColumnsConfig rejects malformed columns", () => {
  assert.throws(
    () =>
      parseTabularColumnsConfig([
        { index: "0", name: "Term", prompt: "Extract the term" },
      ]),
    ValidationError,
  );
});

test("parseChatMessages rejects invalid roles", () => {
  assert.throws(
    () =>
      parseChatMessages([
        { role: "tool", content: "nope" },
      ]),
    ValidationError,
  );
});

test("parseChatMessages accepts optional files and workflow payloads", () => {
  const messages = parseChatMessages([
    {
      role: "user",
      content: "Review this",
      files: [{ filename: "nda.docx", document_id: "doc-1" }],
      workflow: { id: "wf-1", title: "NDA Review" },
    },
  ]);

  assert.equal(messages.length, 1);
  assert.equal(messages[0].role, "user");
  assert.equal(messages[0].files?.[0]?.document_id, "doc-1");
  assert.equal(messages[0].workflow?.id, "wf-1");
});

test("normalizeEmailList lowercases, deduplicates, and rejects invalid addresses", () => {
  const normalized = normalizeEmailList(
    [" A@Example.com ", "a@example.com", "b@example.com "],
    "emails",
  );
  assert.deepEqual(normalized, ["a@example.com", "b@example.com"]);

  assert.throws(
    () => normalizeEmailList(["not-an-email"], "emails"),
    ValidationError,
  );
});

test("parseOptionalEmailArray returns undefined for absent values", () => {
  assert.equal(parseOptionalEmailArray(undefined, "emails"), undefined);
});

test("parseRequiredInteger rejects non-integers", () => {
  assert.equal(parseRequiredInteger(3, "column_index"), 3);
  assert.throws(() => parseRequiredInteger(1.5, "column_index"), ValidationError);
});
