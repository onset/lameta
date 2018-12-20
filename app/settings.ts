import Store from "electron-store";

export const userSettings = new Store({ name: "saymore-user-settings" });
export let showIMDIPanels = userSettings.get("showIMDIPanels") || false;
export function setShowIMDIPanels(show: boolean) {
  showIMDIPanels = show;
  userSettings.set("showIMDIPanels", showIMDIPanels);
}
