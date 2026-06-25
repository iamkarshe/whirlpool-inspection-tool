const BOOT_LOADER_ID = "app-boot-loader";

export function hideAppBootLoader(): void {
  const loader = document.getElementById(BOOT_LOADER_ID);
  if (!loader) return;

  loader.classList.add("is-hidden");
  loader.setAttribute("aria-busy", "false");

  const remove = () => loader.remove();
  loader.addEventListener("transitionend", remove, { once: true });
  window.setTimeout(remove, 300);
}
