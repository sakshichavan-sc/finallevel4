import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should load and display hero section", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByText("StellarVault")).toBeVisible();
  });

  test("should have navigation links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /create/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /lookup/i })).toBeVisible();
  });

  test("should navigate to dashboard", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("should navigate to create escrow page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /create/i }).click();
    await expect(page).toHaveURL(/\/create/);
  });

  test("should navigate to lookup page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /lookup/i }).click();
    await expect(page).toHaveURL(/\/lookup/);
  });
});
