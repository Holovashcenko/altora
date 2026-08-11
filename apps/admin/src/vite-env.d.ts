/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for API calls; relative by default so the dev proxy handles it. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
