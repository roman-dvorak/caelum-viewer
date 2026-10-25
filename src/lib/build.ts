/** Build identification, injected by vite.config.ts at build time. */
declare const __APP_VERSION__: string;
declare const __APP_COMMIT__: string;
declare const __APP_BUILD_TIME__: string;

export const APP_VERSION = __APP_VERSION__;
/** Short git hash of the commit the app was built from. */
export const APP_COMMIT = __APP_COMMIT__;
/** ISO timestamp of the build. */
export const APP_BUILD_TIME = __APP_BUILD_TIME__;
