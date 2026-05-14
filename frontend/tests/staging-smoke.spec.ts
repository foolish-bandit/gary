import path from "node:path";
import { test, expect } from "@playwright/test";

const email = process.env.PLAYWRIGHT_EMAIL ?? "";
const password = process.env.PLAYWRIGHT_PASSWORD ?? "";
const uploadFile = process.env.PLAYWRIGHT_UPLOAD_FILE ?? "";
const skipAuth = process.env.PLAYWRIGHT_SKIP_AUTH === "true";

async function signInIfNeeded(page: import("@playwright/test").Page) {
    if (skipAuth) {
        await page.goto("/assistant");
        return;
    }

    await page.goto("/login");
    await expect(
        page.getByRole("heading", { name: "Log In" }),
    ).toBeVisible();

    if (!email || !password) return;

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL("**/assistant", { timeout: 30_000 });
}

test("public shell renders login", async ({ page }) => {
    if (skipAuth) {
        test.skip(true, "PLAYWRIGHT_SKIP_AUTH=true bypasses the login shell.");
    }

    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
});

test("assistant entry and primary routes render", async ({ page }) => {
    test.skip(
        !skipAuth && (!email || !password),
        "Set PLAYWRIGHT_EMAIL and PLAYWRIGHT_PASSWORD, or PLAYWRIGHT_SKIP_AUTH=true.",
    );

    await signInIfNeeded(page);

    await expect(
        page.getByPlaceholder("Ask a question about your documents..."),
    ).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Ask Gary" }),
    ).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Upload Document" }),
    ).toBeVisible();
    await expect(
        page.getByRole("button", { name: "Review Contract" }),
    ).toBeVisible();

    if (uploadFile) {
        const input = page.locator('input[type="file"]').first();
        await input.setInputFiles(uploadFile);
        await expect(
            page.getByText(path.basename(uploadFile)).first(),
        ).toBeVisible({ timeout: 30_000 });
    }

    await page.getByRole("button", { name: "Review Contract" }).click();
    await expect(page).toHaveURL(/\/review$/);
    await expect(
        page.getByRole("heading", { name: "Review a contract" }),
    ).toBeVisible();

    await page.goto("/assistant");
    await page.getByRole("button", { name: "Draft Something" }).click();
    await expect(page).toHaveURL(/\/draft$/);
    await expect(
        page.getByRole("heading", { name: "Draft Something" }),
    ).toBeVisible();

    await page.goto("/assistant");
    await page.getByRole("button", { name: "Explain This" }).click();
    await expect(page).toHaveURL(/\/explain$/);
    await expect(
        page.getByRole("heading", { name: "Explain This" }),
    ).toBeVisible();
});
