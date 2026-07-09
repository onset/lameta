import { observable, runInAction } from "mobx";

// Observable network connectivity, driven by the browser's online/offline
// events. navigator.onLine only tells us whether the OS has a network
// connection (not whether OneDrive is reachable), but that is enough to warn
// the user that a requested cloud file cannot arrive right now.
export const networkStatus = observable({
  isOnline:
    typeof navigator === "undefined" || navigator.onLine === undefined
      ? true
      : navigator.onLine
});

if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("online", () =>
    runInAction(() => (networkStatus.isOnline = true))
  );
  window.addEventListener("offline", () =>
    runInAction(() => (networkStatus.isOnline = false))
  );
}

export function setOnlineForTests(isOnline: boolean): void {
  runInAction(() => (networkStatus.isOnline = isOnline));
}
