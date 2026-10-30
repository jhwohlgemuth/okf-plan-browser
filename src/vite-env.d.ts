/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __GITLAB_HOSTS__: string[];

interface Window {
  /** Present only in the packaged Tauri shell. */
  __TAURI__?: unknown;
}
