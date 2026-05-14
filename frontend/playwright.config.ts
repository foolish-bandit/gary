import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const channel = process.env.PLAYWRIGHT_BROWSER_CHANNEL ?? "msedge";

export default defineConfig({
    testDir: "./tests",
    timeout: 60_000,
    fullyParallel: false,
    reporter: "line",
    use: {
        ...devices["Desktop Chrome"],
        baseURL,
        channel,
        headless: true,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },
});
