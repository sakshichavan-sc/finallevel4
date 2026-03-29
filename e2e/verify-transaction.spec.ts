import { test, expect } from "@playwright/test";

test.describe("Verify Transaction Page", () => {
  test("should load verify page", async ({ page }) => {
    await page.goto("/verify");
    await expect(page.getByText(/verif/i)).toBeVisible();
  });

  test("should have transaction hash input", async ({ page }) => {
    await page.goto("/verify");
    const input = page.getByPlaceholder(/hash/i).or(page.getByRole("textbox"));
    await expect(input.first()).toBeVisible();
  });
});
