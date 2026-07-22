/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to the server URL to run against the real backend (e.g. http://localhost:4000). */
  readonly VITE_SERVER_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
