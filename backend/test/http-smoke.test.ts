import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import type { AddressInfo } from "node:net";
import { createApp } from "../src/app";
import { singleFileUpload } from "../src/lib/upload";

async function withServer<T>(
  app: express.Express,
  run: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    return await run(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

async function readJson(response: Response): Promise<unknown> {
  return response.json();
}

test("health endpoint returns ok with request id", async () => {
  await withServer(createApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get("x-request-id"));
    assert.deepEqual(await readJson(response), { ok: true });
  });
});

test("chat endpoint rejects requests without authorization", async () => {
  await withServer(createApp(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [] }),
    });

    assert.equal(response.status, 401);
    assert.deepEqual(await readJson(response), {
      detail: "Missing or invalid Authorization header",
    });
  });
});

test("document upload endpoint rejects requests without authorization", async () => {
  await withServer(createApp(), async (baseUrl) => {
    const form = new FormData();
    form.append(
      "file",
      new Blob(["hello"], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
      "sample.docx",
    );

    const response = await fetch(`${baseUrl}/single-documents`, {
      method: "POST",
      body: form,
    });

    assert.equal(response.status, 401);
    assert.deepEqual(await readJson(response), {
      detail: "Missing or invalid Authorization header",
    });
  });
});

test("authorized requests fail clearly when server auth is not configured", async () => {
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_URL = "";
  process.env.SUPABASE_SECRET_KEY = "";

  try {
    await withServer(createApp(), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: {
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: [] }),
      });

      assert.equal(response.status, 500);
      assert.deepEqual(await readJson(response), {
        detail: "Server auth is not configured",
      });
    });
  } finally {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;

    if (previousKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previousKey;
  }
});

test("singleFileUpload accepts one file and surfaces it to the handler", async () => {
  const app = express();
  app.post("/upload", singleFileUpload("file"), (req, res) => {
    const file = req.file;
    res.json({
      filename: file?.originalname ?? null,
      size: file?.size ?? 0,
    });
  });

  await withServer(app, async (baseUrl) => {
    const form = new FormData();
    form.append(
      "file",
      new Blob(["hello world"], { type: "text/plain" }),
      "sample.txt",
    );

    const response = await fetch(`${baseUrl}/upload`, {
      method: "POST",
      body: form,
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await readJson(response), {
      filename: "sample.txt",
      size: 11,
    });
  });
});

test("singleFileUpload rejects duplicate files on the same field", async () => {
  const app = express();
  app.post("/upload", singleFileUpload("file"), (_req, res) => {
    res.json({ ok: true });
  });

  await withServer(app, async (baseUrl) => {
    const form = new FormData();
    form.append(
      "file",
      new Blob(["one"], { type: "text/plain" }),
      "one.txt",
    );
    form.append(
      "file",
      new Blob(["two"], { type: "text/plain" }),
      "two.txt",
    );

    const response = await fetch(`${baseUrl}/upload`, {
      method: "POST",
      body: form,
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await readJson(response), {
      detail: "Upload failed: Too many files",
    });
  });
});
