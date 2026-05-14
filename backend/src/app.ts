import { randomUUID } from "crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { chatRouter } from "./routes/chat";
import { projectsRouter } from "./routes/projects";
import { projectChatRouter } from "./routes/projectChat";
import { documentsRouter } from "./routes/documents";
import { tabularRouter } from "./routes/tabular";
import { workflowsRouter } from "./routes/workflows";
import { userRouter } from "./routes/user";
import { downloadsRouter } from "./routes/downloads";

export function createApp() {
  const app = express();
  const RATE_LIMIT_WINDOW_MS = Number(
    process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000,
  );
  const RATE_LIMIT_MAX_REQUESTS = Number(
    process.env.RATE_LIMIT_MAX_REQUESTS ?? 300,
  );

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
      credentials: true,
    }),
  );

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
  app.use((req, res, next) => {
    const requestId = randomUUID();
    res.setHeader("X-Request-ID", requestId);
    res.locals.requestId = requestId;
    next();
  });
  app.use(
    rateLimit({
      windowMs: RATE_LIMIT_WINDOW_MS,
      limit: RATE_LIMIT_MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        detail: "Too many requests. Please try again later.",
      },
      skip: (req) => req.path === "/health",
    }),
  );
  app.use(express.json({ limit: "50mb" }));

  app.use("/chat", chatRouter);
  app.use("/projects", projectsRouter);
  app.use("/projects/:projectId/chat", projectChatRouter);
  app.use("/single-documents", documentsRouter);
  app.use("/tabular-review", tabularRouter);
  app.use("/workflows", workflowsRouter);
  app.use("/user", userRouter);
  app.use("/users", userRouter);
  app.use("/download", downloadsRouter);

  app.get("/health", (_req, res) => res.json({ ok: true }));

  return app;
}
