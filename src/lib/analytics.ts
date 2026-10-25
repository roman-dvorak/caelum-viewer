/**
 * Microsoft Clarity. The project ID comes from VITE_CLARITY_ID at build time (the Pages
 * workflow fills it from the CLARITY_PROJECT_ID repository secret); without it — local
 * development, forks, self-hosted builds — nothing is loaded.
 */
export function initClarity(id = import.meta.env.VITE_CLARITY_ID as string | undefined): void {
  if (!id || !/^[a-z0-9]+$/i.test(id)) return;
  const w = window as Window & { clarity?: { (...args: unknown[]): void; q?: unknown[][] } };
  // Queue calls made before the tag loads, as the official snippet does.
  w.clarity ??= Object.assign((...args: unknown[]) => (w.clarity!.q ??= []).push(args), {});
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${id}`;
  document.head.appendChild(script);
}
