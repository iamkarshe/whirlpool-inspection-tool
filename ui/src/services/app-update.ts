export async function hardReload(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const shouldUpdate = window.confirm(
    "Updating the app will log you out. Do you want to continue?",
  );

  if (!shouldUpdate) {
    return;
  }

  window.localStorage.clear();
  window.sessionStorage.clear();

  if ("caches" in window) {
    const cacheKeys = await window.caches.keys();

    await Promise.all(
      cacheKeys.map((cacheKey) => window.caches.delete(cacheKey)),
    );
  }

  window.location.reload();
}
