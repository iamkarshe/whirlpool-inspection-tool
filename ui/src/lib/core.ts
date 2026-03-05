export function setPageTitle(title: string) {
  document.title = `${title} - ${import.meta.env.VITE_APP_TITLE}`;
}
