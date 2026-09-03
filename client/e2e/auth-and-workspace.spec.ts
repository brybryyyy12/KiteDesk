import {
  expect,
  test,
} from "@playwright/test";

test("redirects a signed-out user away from protected pages", async ({ page }) => {
  await page.goto("/projects");

  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("heading", { name: "Welcome back" })
  ).toBeVisible();
});

test("validates the login form in the browser", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByText("Email is required.")).toBeVisible();
  await expect(page.getByText("Password is required.")).toBeVisible();
});

test("logs in and creates the user's first workspace", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("e2e@example.com");
  await page.getByLabel("Password").fill("SecurePass123");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/onboarding/workspace");
  await expect(
    page.getByRole("heading", { name: "Create your first workspace" })
  ).toBeVisible();

  await page.getByLabel("Workspace name").fill("E2E Workspace");
  await page.getByLabel(/Description/).fill("Created by Playwright");
  await page.getByRole("button", { name: "Create My Workspace" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("E2E Workspace", { exact: true }).first()).toBeVisible();
});
