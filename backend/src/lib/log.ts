const DEBUG_ENABLED = process.env.GARY_DEBUG_LOGS === "true";

export function debugLog(...args: unknown[]) {
  if (!DEBUG_ENABLED) return;
  console.log(...args);
}

export function infoLog(...args: unknown[]) {
  console.log(...args);
}

export function errorLog(...args: unknown[]) {
  console.error(...args);
}
