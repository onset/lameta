import { ElectronApplication, expect } from "@playwright/test";

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
