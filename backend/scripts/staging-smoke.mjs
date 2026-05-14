import { readFile } from "node:fs/promises";
import path from "node:path";

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function optionalEnv(name) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

async function expectJson(response, expectedStatus, label) {
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (response.status !== expectedStatus) {
    throw new Error(
      `${label} failed: expected ${expectedStatus}, got ${response.status}. Body: ${JSON.stringify(data)}`,
    );
  }

  return data;
}

async function main() {
  const baseUrl = requiredEnv("STAGING_API_BASE_URL").replace(/\/+$/, "");
  const token = optionalEnv("STAGING_BEARER_TOKEN");
  const uploadFilePath = optionalEnv("STAGING_UPLOAD_FILE");
  let uploadedDocumentId = null;

  console.log(`Smoke target: ${baseUrl}`);

  const health = await fetch(`${baseUrl}/health`);
  const healthBody = await expectJson(health, 200, "health");
  if (!healthBody?.ok) {
    throw new Error(`health failed: unexpected body ${JSON.stringify(healthBody)}`);
  }
  console.log("PASS /health");

  const unauthChat = await fetch(`${baseUrl}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [] }),
  });
  const unauthBody = await expectJson(
    unauthChat,
    401,
    "unauthenticated chat boundary",
  );
  if (unauthBody?.detail !== "Missing or invalid Authorization header") {
    throw new Error(
      `unauthenticated chat boundary returned unexpected detail ${JSON.stringify(unauthBody)}`,
    );
  }
  console.log("PASS unauthorized /chat boundary");

  if (!token) {
    console.log(
      "SKIP authenticated checks: set STAGING_BEARER_TOKEN to verify profile and upload flows.",
    );
    return;
  }

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const profile = await fetch(`${baseUrl}/user/profile`, {
    headers: authHeaders,
  });
  const profileBody = await expectJson(profile, 200, "authenticated profile");
  if (
    !profileBody ||
    typeof profileBody !== "object" ||
    !("provider_availability" in profileBody)
  ) {
    throw new Error(
      `authenticated profile returned unexpected body ${JSON.stringify(profileBody)}`,
    );
  }
  console.log("PASS authenticated /user/profile");

  const invalidChat = await fetch(`${baseUrl}/chat`, {
    method: "POST",
    headers: {
      ...authHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages: "not-an-array" }),
  });
  const invalidChatBody = await expectJson(
    invalidChat,
    400,
    "chat validation",
  );
  if (
    !invalidChatBody?.detail ||
    typeof invalidChatBody.detail !== "string"
  ) {
    throw new Error(
      `chat validation returned unexpected body ${JSON.stringify(invalidChatBody)}`,
    );
  }
  console.log("PASS authenticated /chat validation");

  if (!uploadFilePath) {
    console.log(
      "SKIP upload flow: set STAGING_UPLOAD_FILE to verify upload and cleanup.",
    );
    return;
  }

  const fileBytes = await readFile(uploadFilePath);
  const form = new FormData();
  form.append(
    "file",
    new File([fileBytes], path.basename(uploadFilePath)),
  );

  const upload = await fetch(`${baseUrl}/single-documents`, {
    method: "POST",
    headers: authHeaders,
    body: form,
  });
  const uploadBody = await expectJson(upload, 201, "document upload");
  uploadedDocumentId =
    uploadBody && typeof uploadBody === "object" ? uploadBody.id ?? null : null;
  if (!uploadedDocumentId || uploadBody.status !== "ready") {
    throw new Error(
      `document upload returned unexpected body ${JSON.stringify(uploadBody)}`,
    );
  }
  console.log(`PASS upload /single-documents (${uploadedDocumentId})`);

  try {
    const list = await fetch(`${baseUrl}/single-documents`, {
      headers: authHeaders,
    });
    const listBody = await expectJson(list, 200, "document list");
    if (!Array.isArray(listBody)) {
      throw new Error(`document list returned unexpected body ${JSON.stringify(listBody)}`);
    }
    const exists = listBody.some((doc) => doc?.id === uploadedDocumentId);
    if (!exists) {
      throw new Error("uploaded document was not returned by /single-documents");
    }
    console.log("PASS authenticated /single-documents list");
  } finally {
    const cleanup = await fetch(
      `${baseUrl}/single-documents/${uploadedDocumentId}`,
      {
        method: "DELETE",
        headers: authHeaders,
      },
    );
    await expectJson(cleanup, 204, "document cleanup");
    console.log(`PASS cleanup delete /single-documents/${uploadedDocumentId}`);
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : `Smoke failed: ${String(error)}`,
  );
  process.exitCode = 1;
});
