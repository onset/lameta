export function statusIconPath(status: string, choices: string[]): string {
  return choices.includes(status) ? `assets/status-${status}.png` : "assets/warning.png";
}
