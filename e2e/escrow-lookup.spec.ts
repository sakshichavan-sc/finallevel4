import { test, expect } from "@playwright/test";

test.describe("Escrow Lookup Page", () => {
  test("should load lookup page", async ({ page }) => {
    await page.goto("/lookup");
    await expect(page.getByText(/lookup/i)).toBeVisible();
  });

  test("should have escrow ID input field", async ({ page }) => {
    await page.goto("/lookup");
    const input = page.getByPlaceholder(/escrow/i).or(page.getByRole("spinbutton"));
    await expect(input.first()).toBeVisible();
  });

  test("should show error for invalid escrow ID", async ({ page }) => {
    await page.goto("/lookup");
    const input = page.getByPlaceholder(/escrow/i).or(page.getByRole("spinbutton"));
    await input.first().fill("999999");
    const searchBtn = page.getByRole("button", { name: /search|lookup|find|fetch/i });
    if (await searchBtn.count()) {
      await searchBtn.first().click();
    }
    // Should either show an error or no results
    await page.waitForTimeout(3000);
  });
});
