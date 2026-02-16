import type { VercelRequest, VercelResponse } from '@vercel/node'
import { JWT } from 'google-auth-library'

const MODEL = 'gemini-2.0-flash'
const ALLOWED_DOMAIN = 'mara.care'

interface AnalyzeBody {
  prompt: string
  pdfBase64?: string
}

interface GeminiPart {
  text?: string
  inlineData?: {
    mimeType: string
    data: string
  }
}

interface GeminiRequest {
  contents: Array<{
    role: 'user'
    parts: GeminiPart[]
  }>
  generationConfig?: {
    temperature?: number
    maxOutputTokens?: number
  }
}

async function verifyGoogleToken(accessToken: string): Promise<{ email: string } | null> {
  const res = await fetch(
    `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
  )
  if (!res.ok) return null
  const data = await res.json()
  const email = data.email as string
  if (!email || data.error) return null
  return { email: email.toLowerCase() }
}

function isEmailAllowed(email: string): boolean {
  const domain = process.env.ALLOWED_EMAIL_DOMAIN || ALLOWED_DOMAIN
  const normalizedDomain = domain.toLowerCase().replace(/^@/, '')
  return email.endsWith('@' + normalizedDomain)
}

const VERTEX_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'

async function getVertexAccessToken(): Promise<string> {
  const raw = process.env.VERTEX_SERVICE_ACCOUNT_JSON
  if (!raw) {
    throw new Error('VERTEX_SERVICE_ACCOUNT_JSON is not set')
  }
  const credentials = JSON.parse(raw) as { client_email: string; private_key: string }
  const client = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [VERTEX_SCOPE],
  })
  const tokens = await client.authorize()
  if (!tokens?.access_token) {
    throw new Error('Failed to obtain Vertex AI access token')
  }
  return tokens.access_token
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' })
  }

  const user = await verifyGoogleToken(token)
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  if (!isEmailAllowed(user.email)) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Only @' + (process.env.ALLOWED_EMAIL_DOMAIN || ALLOWED_DOMAIN) + ' accounts are allowed',
    })
  }

  const body = req.body as AnalyzeBody
  const prompt = typeof body?.prompt === 'string' ? body.prompt : ''
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt' })
  }

  const parts: GeminiPart[] = []
  if (body.pdfBase64 && typeof body.pdfBase64 === 'string') {
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: body.pdfBase64,
      },
    })
  }
  parts.push({ text: prompt })

  const projectId = process.env.GOOGLE_CLOUD_PROJECT
  const location = process.env.VERTEX_LOCATION || 'us-central1'
  if (!projectId) {
    return res.status(500).json({ error: 'GOOGLE_CLOUD_PROJECT is not configured' })
  }

  const requestBody: GeminiRequest = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 8192,
    },
  }

  try {
    const vertexToken = await getVertexAccessToken()
    const endpointUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${MODEL}:generateContent`
    const vertexRes = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${vertexToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!vertexRes.ok) {
      const errData = await vertexRes.json().catch(() => ({}))
      const message = (errData as { error?: { message?: string } })?.error?.message || vertexRes.statusText
      return res.status(vertexRes.status).json({
        error: 'Vertex AI error',
        message,
      })
    }

    const data = await vertexRes.json()
    return res.status(200).json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Vertex AI request failed'
    return res.status(500).json({ error: 'Analysis failed', message })
  }
}
