/** Registers the service worker (public/sw.js) that makes the viewer an installable PWA; production builds only. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    // Relative to the page, so it works under a GitHub Pages project path as well as at a domain root.
    navigator.serviceWorker.register(new URL("sw.js", document.baseURI)).catch(() => {});
  });
}
