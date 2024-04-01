import { ElectronApplication, Page, expect } from "@playwright/test";

export async function expectMenuWithLabel(
  app: ElectronApplication,
  label: string
) {
  const menu = await app.evaluate(
    async ({ Menu }, params) => {
      const menubar = Menu.getApplicationMenu();

      const menu = menubar?.items.find(
        (item) => item.label.replace(/&/g, "") === params.label
      );
      return menu;
    },
    { label }
  );
  expect(menu).toBeTruthy();
}
export async function shouldSeeExactlyOnce(
  page: Page,
  labels: string[],
  exact = true
) {
  for (const label of labels) {
    await expect(page.getByText(label, { exact: exact })).toBeVisible();
  }
}
export async function shouldAtLeastOnce(
  page: Page,
  labels: string[],
  exact = true
) {
  for (const label of labels) {
    await expect(page.getByText(label, { exact: exact })).toBeTruthy();
  }
}
export async function shouldHaveMultiple(
  page: Page,
  label: string,
  count: number,
  exact = true
) {
  const x = await page.getByText(label, { exact: exact });
  const c = await x.count();
  await expect(c).toBe(count);
}
