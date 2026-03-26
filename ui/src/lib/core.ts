export function setPageTitle(title: string) {
  document.title = `${title} - ${import.meta.env.VITE_APP_TITLE}`;
}

export function formatCreatedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}
