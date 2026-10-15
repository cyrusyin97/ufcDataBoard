import type { Page } from "@playwright/test";
export async function chooseDivision(page: Page, id: string) {
  await page
    .getByRole("button", { name: "Weight division", exact: true })
    .click();
  await page.locator(`[data-division-option="${id}"]`).click();
}
