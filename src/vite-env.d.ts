/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_GOOGLE_PROJECT_ID: string
  readonly VITE_GOOGLE_LOCATION: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Build-time constants injected from Vercel env vars via vite.config.ts define
declare const __GOAUTHID__: string
declare const __GOAUTHSECRET__: string
declare const __GOPROJECTID__: string
declare const __GOLOCATION__: string
