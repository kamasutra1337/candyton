/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional backend base URL. When empty the game runs fully offline. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
