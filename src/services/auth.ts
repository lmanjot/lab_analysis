import { AuthState } from '../types'

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
            error_callback?: (error: { type: string; message: string }) => void
          }): TokenClient
        }
        id: {
          initialize(config: {
            client_id: string
            callback: (response: { credential: string }) => void
          }): void
          prompt(): void
          revoke(email: string, callback: () => void): void
        }
      }
    }
  }
}

interface TokenResponse {
  access_token: string
  expires_in: number
  scope: string
  token_type: string
  error?: string
}

interface TokenClient {
  requestAccessToken(overrideConfig?: { prompt?: string }): void
}

const STORAGE_KEY = 'lab_analysis_auth'

let tokenClient: TokenClient | null = null
let onAuthChange: ((state: AuthState) => void) | null = null
let authInitError: string | null = null
let authReady = false
let lastEmail: string | null = null

const SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'openid',
  'email',
  'profile',
].join(' ')

function createEmptyAuthState(): AuthState {
  return {
    isSignedIn: false,
    accessToken: null,
    email: null,
    name: null,
    expiresAt: null,
  }
}

function saveAuthToStorage(state: AuthState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* storage full or unavailable */ }
}

function loadAuthFromStorage(): AuthState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const state: AuthState = JSON.parse(raw)
    if (!state.isSignedIn || !state.accessToken) return null
    return state
  } catch {
    return null
  }
}

function clearAuthStorage(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
}

async function fetchUserInfo(accessToken: string): Promise<{ email: string; name: string }> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error('Failed to fetch user info')
  const data = await response.json()
  return { email: data.email, name: data.name }
}

function loadGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      const check = () => {
        if (window.google?.accounts?.oauth2) {
          resolve()
        } else {
          setTimeout(check, 100)
        }
      }
      check()
    }
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
}

function getClientId(): string {
  // 1. Check Vercel env var (injected at build time via vite.config.ts define)
  if (typeof __GOAUTHID__ !== 'undefined' && __GOAUTHID__) {
    return __GOAUTHID__
  }
  // 2. Check .env file (VITE_-prefixed, for local development)
  if (import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return import.meta.env.VITE_GOOGLE_CLIENT_ID
  }
  return ''
}

export function getGoogleProjectId(): string {
  if (typeof __GOPROJECTID__ !== 'undefined' && __GOPROJECTID__) {
    return __GOPROJECTID__
  }
  if (import.meta.env.VITE_GOOGLE_PROJECT_ID) {
    return import.meta.env.VITE_GOOGLE_PROJECT_ID
  }
  return ''
}

export function getGoogleLocation(): string {
  if (typeof __GOLOCATION__ !== 'undefined' && __GOLOCATION__) {
    return __GOLOCATION__
  }
  if (import.meta.env.VITE_GOOGLE_LOCATION) {
    return import.meta.env.VITE_GOOGLE_LOCATION
  }
  return 'us-central1'
}

function applyAuthState(state: AuthState): void {
  saveAuthToStorage(state)
  lastEmail = state.email
  onAuthChange?.(state)
}

export function initAuth(callback: (state: AuthState) => void): void {
  onAuthChange = callback
  authInitError = null
  authReady = false

  // Restore session from storage immediately (avoids flash of signed-out UI)
  const stored = loadAuthFromStorage()
  if (stored && stored.expiresAt && Date.now() < stored.expiresAt - 60000) {
    lastEmail = stored.email
    callback(stored)
  }

  const clientId = getClientId()
  if (!clientId) {
    authInitError = 'MISSING_CLIENT_ID'
    console.warn('Google OAuth Client ID not found. Set goauthid in Vercel or VITE_GOOGLE_CLIENT_ID in .env')
    return
  }

  loadGisScript()
    .then(() => {
      tokenClient = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: async (response: TokenResponse) => {
          if (response.error) {
            console.error('OAuth error:', response.error)
            clearAuthStorage()
            onAuthChange?.(createEmptyAuthState())
            return
          }

          try {
            const userInfo = await fetchUserInfo(response.access_token)
            applyAuthState({
              isSignedIn: true,
              accessToken: response.access_token,
              email: userInfo.email,
              name: userInfo.name,
              expiresAt: Date.now() + response.expires_in * 1000,
            })
          } catch {
            applyAuthState({
              isSignedIn: true,
              accessToken: response.access_token,
              email: stored?.email ?? null,
              name: stored?.name ?? null,
              expiresAt: Date.now() + response.expires_in * 1000,
            })
          }
        },
        error_callback: (error) => {
          console.error('OAuth error callback:', error)
        },
      })
      authReady = true

      // If we had a stored session but the token is expired, silently refresh
      if (stored && stored.expiresAt && Date.now() >= stored.expiresAt - 60000) {
        tokenClient.requestAccessToken({ prompt: '' })
      }
    })
    .catch((err) => {
      authInitError = 'LOAD_FAILED'
      console.error('Failed to initialize Google Auth:', err)
    })
}

export function getAuthStatus(): { ready: boolean; error: string | null } {
  return { ready: authReady, error: authInitError }
}

export function signIn(): string | null {
  if (authInitError === 'MISSING_CLIENT_ID') {
    return 'Google OAuth Client ID is not configured. Set goauthid in Vercel, or create a .env file with VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com'
  }
  if (!tokenClient) {
    return 'Google sign-in is still loading. Please try again in a moment.'
  }
  // 'select_account' forces the account picker so users can switch accounts
  tokenClient.requestAccessToken({ prompt: 'select_account' })
  return null
}

export function signOut(): void {
  clearAuthStorage()
  onAuthChange?.(createEmptyAuthState())
  if (window.google?.accounts?.id) {
    try {
      window.google.accounts.id.revoke(lastEmail || '', () => {})
    } catch { /* ignore */ }
  }
  lastEmail = null
}

export function isTokenExpired(auth: AuthState): boolean {
  if (!auth.expiresAt) return true
  return Date.now() >= auth.expiresAt - 60000 // 1 minute buffer
}

export function refreshToken(): void {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: '' })
  }
}
