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

let tokenClient: TokenClient | null = null
let onAuthChange: ((state: AuthState) => void) | null = null
let authInitError: string | null = null
let authReady = false

const SCOPES = [
  'https://www.googleapis.com/auth/generative-language',
  'https://www.googleapis.com/auth/generative-language.tuning',
  'https://www.googleapis.com/auth/generative-language.retriever',
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

export function initAuth(callback: (state: AuthState) => void): void {
  onAuthChange = callback
  authInitError = null
  authReady = false

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) {
    authInitError = 'MISSING_CLIENT_ID'
    console.warn('VITE_GOOGLE_CLIENT_ID is not set. Create a .env file with your Google OAuth Client ID.')
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
            onAuthChange?.(createEmptyAuthState())
            return
          }

          try {
            const userInfo = await fetchUserInfo(response.access_token)
            const state: AuthState = {
              isSignedIn: true,
              accessToken: response.access_token,
              email: userInfo.email,
              name: userInfo.name,
              expiresAt: Date.now() + response.expires_in * 1000,
            }
            onAuthChange?.(state)
          } catch {
            const state: AuthState = {
              isSignedIn: true,
              accessToken: response.access_token,
              email: null,
              name: null,
              expiresAt: Date.now() + response.expires_in * 1000,
            }
            onAuthChange?.(state)
          }
        },
        error_callback: (error) => {
          console.error('OAuth error callback:', error)
        },
      })
      authReady = true
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
    return 'Google OAuth Client ID is not configured. Create a .env file with VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com'
  }
  if (!tokenClient) {
    return 'Google sign-in is still loading. Please try again in a moment.'
  }
  tokenClient.requestAccessToken({ prompt: 'consent' })
  return null
}

export function signOut(): void {
  onAuthChange?.(createEmptyAuthState())
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
