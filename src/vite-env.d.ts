/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Build-time constants injected from Vercel env vars via vite.config.ts define
declare const __GOAUTHID__: string
declare const __GOAUTHSECRET__: string
