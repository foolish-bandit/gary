import type { ChatMessage } from "./chatTools";

export class ValidationError extends Error {
  status = 400;
}

type DocumentRef = { filename: string; document_id: string };
type TabularColumnConfig = Record<string, unknown> & {
  index: number;
  name: string;
  prompt: string;
  format?: string;
  tags?: string[];
};

function fail(detail: string): never {
  throw new ValidationError(detail);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function ensureObject(
  value: unknown,
  detail = "Request body must be an object",
): Record<string, unknown> {
  if (!isRecord(value)) fail(detail);
  return value;
}

export function parseOptionalString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") fail(`${field} must be a string`);
  return value;
}

export function parseOptionalNullableString(
  value: unknown,
  field: string,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") fail(`${field} must be a string or null`);
  return value;
}

export function parseRequiredTrimmedString(
  value: unknown,
  field: string,
): string {
  if (typeof value !== "string" || !value.trim()) {
    fail(`${field} is required`);
  }
  return value.trim();
}

export function parseOptionalStringArray(
  value: unknown,
  field: string,
  options?: { maxItems?: number },
): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) fail(`${field} must be an array of strings`);

  const items = value.map((item, index) => {
    if (typeof item !== "string" || !item.trim()) {
      fail(`${field}[${index}] must be a non-empty string`);
    }
    return item.trim();
  });

  if (
    options?.maxItems !== undefined &&
    items.length > options.maxItems
  ) {
    fail(`${field} must contain at most ${options.maxItems} items`);
  }

  return items;
}

export function parseOptionalBoolean(
  value: unknown,
  field: string,
): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") fail(`${field} must be a boolean`);
  return value;
}

export function parseRequiredNumber(
  value: unknown,
  field: string,
): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    fail(`${field} must be a number`);
  }
  return value;
}

export function parseRequiredInteger(
  value: unknown,
  field: string,
): number {
  const parsed = parseRequiredNumber(value, field);
  if (!Number.isInteger(parsed)) fail(`${field} must be an integer`);
  return parsed;
}

export function normalizeEmailList(
  emails: string[],
  field: string,
): string[] {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const email of emails) {
    const normalized = email.trim().toLowerCase();
    if (!normalized) continue;
    if (!normalized.includes("@")) {
      fail(`${field} contains an invalid email address`);
    }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    cleaned.push(normalized);
  }
  return cleaned;
}

export function parseOptionalEmailArray(
  value: unknown,
  field: string,
  options?: { maxItems?: number },
): string[] | undefined {
  const emails = parseOptionalStringArray(value, field, options);
  if (!emails) return undefined;
  return normalizeEmailList(emails, field);
}

function parseDocumentRef(
  value: unknown,
  field: string,
): DocumentRef {
  const row = ensureObject(value, `${field} must be an object`);
  return {
    filename: parseRequiredTrimmedString(row.filename, `${field}.filename`),
    document_id: parseRequiredTrimmedString(
      row.document_id,
      `${field}.document_id`,
    ),
  };
}

export function parseOptionalDocumentRef(
  value: unknown,
  field: string,
): DocumentRef | undefined {
  if (value === undefined) return undefined;
  return parseDocumentRef(value, field);
}

export function parseOptionalDocumentRefList(
  value: unknown,
  field: string,
): DocumentRef[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) fail(`${field} must be an array`);
  return value.map((item, index) =>
    parseDocumentRef(item, `${field}[${index}]`),
  );
}

export function parseChatMessages(
  value: unknown,
  field = "messages",
): ChatMessage[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${field} must be a non-empty array`);
  }

  return value.map((item, index) => {
    const row = ensureObject(item, `${field}[${index}] must be an object`);
    const role = parseRequiredTrimmedString(row.role, `${field}[${index}].role`);
    if (!["user", "assistant", "system"].includes(role)) {
      fail(`${field}[${index}].role is invalid`);
    }

    const content = row.content;
    if (content !== null && typeof content !== "string") {
      fail(`${field}[${index}].content must be a string or null`);
    }

    const files = parseOptionalDocumentRefList(
      row.files,
      `${field}[${index}].files`,
    );

    let workflow: { id: string; title: string } | undefined;
    if (row.workflow !== undefined) {
      const workflowRow = ensureObject(
        row.workflow,
        `${field}[${index}].workflow must be an object`,
      );
      workflow = {
        id: parseRequiredTrimmedString(
          workflowRow.id,
          `${field}[${index}].workflow.id`,
        ),
        title: parseRequiredTrimmedString(
          workflowRow.title,
          `${field}[${index}].workflow.title`,
        ),
      };
    }

    return {
      role,
      content,
      ...(files ? { files } : {}),
      ...(workflow ? { workflow } : {}),
    };
  });
}

export function parseTabularColumnsConfig(
  value: unknown,
  field = "columns_config",
): TabularColumnConfig[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${field} must be a non-empty array`);
  }

  return value.map((item, index) => {
    const row = ensureObject(item, `${field}[${index}] must be an object`);
    const parsed: TabularColumnConfig = {
      ...row,
      index: parseRequiredInteger(row.index, `${field}[${index}].index`),
      name: parseRequiredTrimmedString(row.name, `${field}[${index}].name`),
      prompt: parseRequiredTrimmedString(
        row.prompt,
        `${field}[${index}].prompt`,
      ),
    };

    const format = parseOptionalString(row.format, `${field}[${index}].format`);
    if (format !== undefined) parsed.format = format;

    const tags = parseOptionalStringArray(row.tags, `${field}[${index}].tags`, {
      maxItems: 50,
    });
    if (tags) parsed.tags = tags;

    return parsed;
  });
}
